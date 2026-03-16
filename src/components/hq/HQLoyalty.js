// HQLoyalty.js v2.1
// WP-Z: Tier System Unification — added recalculate_all_tiers() RPC call
//       after every loyalty_config UPDATE so all existing customer tiers
//       immediately reflect the new thresholds. No hardcoded thresholds remain.
// v2.0: Schema Selector + Live Config (Conservative/Standard/Aggressive presets)
// v1.2: Campaigns tab
// v1.1: 6 sub-tabs: Earning Rules | Tiers | Economics | Referrals | QR Security | Simulator

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import InfoTooltip from "../InfoTooltip";

const C = {
  bg: "#f9f8f5",
  card: "#ffffff",
  border: "#e8e4dc",
  borderDark: "#c8c0b0",
  green: "#2d4a2d",
  greenMid: "#3d6b3d",
  greenLight: "#52b788",
  greenPale: "#e8f5e9",
  blue: "#1565C0",
  bluePale: "#E3F2FD",
  amber: "#F57F17",
  amberPale: "#FFF8E1",
  red: "#c62828",
  redPale: "#FFEBEE",
  purple: "#6A1B9A",
  purpleMid: "#9C27B0",
  purplePale: "#F3E5F5",
  text: "#1a1a1a",
  textMid: "#4a4a4a",
  textLight: "#888888",
  white: "#ffffff",
  gold: "#b5935a",
  goldPale: "#FFF8E7",
};
const FONT_DISPLAY = "'Cormorant Garamond', Georgia, serif";
const FONT_BODY = "'Jost', 'Helvetica Neue', Arial, sans-serif";

const DEFAULT_CONFIG = {
  pts_qr_scan: 10,
  pts_per_r100_online: 4.0,
  pts_per_r100_retail: 1.5,
  online_bonus_pct: 100.0,
  pts_profile_complete: 50,
  pts_phone_verify: 50,
  mult_bronze: 1.0,
  mult_silver: 1.5,
  mult_gold: 2.0,
  mult_platinum: 3.0,
  threshold_silver: 150,
  threshold_gold: 350,
  threshold_platinum: 750,
  pts_referral_referrer: 200,
  pts_referral_referee: 100,
  referral_min_order_zar: 100,
  redemption_value_zar: 0.15,
  min_pts_to_redeem: 100,
  max_redeem_pct_per_order: 20.0,
  breakage_rate: 0.25,
  pts_expiry_months: 24,
  max_scans_per_qr: 1,
  qr_validity_months: 18,
  pts_streak_bonus: 200,
  streak_interval: 5,
  pts_birthday: 100,
  active_schema: "standard",
};

const SCHEMAS = [
  {
    id: "conservative",
    label: "Conservative",
    icon: "🛡️",
    tagline: "Low cost · entry level",
    description:
      "Minimal programme cost. Ideal for the launch phase — test engagement without committing to high reward liabilities. Points are worth less per transaction but are easy to control and predict. Best when you want to measure customer engagement before scaling up rewards.",
    costBadge: "~R0.065 per point issued",
    costColor: "#1565C0",
    costBg: "#E3F2FD",
    preview: [
      { label: "QR scan reward", value: "5 pts" },
      { label: "R400 online order", value: "~12 pts  (R1.20 value)" },
      { label: "Referral earned", value: "100 pts (referrer)" },
      { label: "1 000 pts cash value", value: "R100" },
      { label: "Est. cost / 100 orders", value: "~R78 / month" },
    ],
    values: {
      pts_qr_scan: 5,
      pts_per_r100_online: 2,
      pts_per_r100_retail: 1,
      online_bonus_pct: 50,
      pts_referral_referrer: 100,
      pts_referral_referee: 50,
      pts_streak_bonus: 100,
      streak_interval: 5,
      pts_birthday: 50,
      pts_profile_complete: 25,
      pts_phone_verify: 25,
      mult_bronze: 1.0,
      mult_silver: 1.25,
      mult_gold: 1.5,
      mult_platinum: 2.0,
      threshold_silver: 200,
      threshold_gold: 500,
      threshold_platinum: 1000,
      redemption_value_zar: 0.1,
      min_pts_to_redeem: 200,
      max_redeem_pct_per_order: 15,
      breakage_rate: 0.35,
      pts_expiry_months: 18,
      max_scans_per_qr: 1,
      qr_validity_months: 18,
      referral_min_order_zar: 100,
    },
  },
  {
    id: "standard",
    label: "Standard",
    icon: "⚖️",
    tagline: "Balanced · international best practice",
    description:
      "Follows global loyalty programme benchmarks. Good balance between customer motivation and programme cost. Points feel meaningful — customers notice them on their dashboard and are motivated to earn more. Tier multipliers create genuine incentive to remain loyal.",
    costBadge: "~R0.11 per point issued",
    costColor: "#3d6b3d",
    costBg: "#e8f5e9",
    preview: [
      { label: "QR scan reward", value: "10 pts" },
      { label: "R400 online order", value: "~48 pts  (R7.20 value)" },
      { label: "Referral earned", value: "200 pts (referrer)" },
      { label: "1 000 pts cash value", value: "R150" },
      { label: "Est. cost / 100 orders", value: "~R288 / month" },
    ],
    values: {
      pts_qr_scan: 10,
      pts_per_r100_online: 4,
      pts_per_r100_retail: 1.5,
      online_bonus_pct: 100,
      pts_referral_referrer: 200,
      pts_referral_referee: 100,
      pts_streak_bonus: 200,
      streak_interval: 5,
      pts_birthday: 100,
      pts_profile_complete: 50,
      pts_phone_verify: 50,
      mult_bronze: 1.0,
      mult_silver: 1.5,
      mult_gold: 2.0,
      mult_platinum: 3.0,
      threshold_silver: 150,
      threshold_gold: 350,
      threshold_platinum: 750,
      redemption_value_zar: 0.15,
      min_pts_to_redeem: 100,
      max_redeem_pct_per_order: 20,
      breakage_rate: 0.25,
      pts_expiry_months: 24,
      max_scans_per_qr: 1,
      qr_validity_months: 18,
      referral_min_order_zar: 100,
    },
  },
  {
    id: "aggressive",
    label: "Aggressive",
    icon: "🚀",
    tagline: "High reward · acquisition focused",
    description:
      "Maximum engagement and acquisition power. Higher programme cost but drives strong word-of-mouth, repeat purchase, and brand advocacy. Points accumulate fast — customers reach redemption thresholds quickly and feel genuinely rewarded. Best for growth phases or competitive markets.",
    costBadge: "~R0.16 per point issued",
    costColor: "#6A1B9A",
    costBg: "#F3E5F5",
    preview: [
      { label: "QR scan reward", value: "25 pts" },
      { label: "R400 online order", value: "~100 pts  (Bronze, no mult)" },
      { label: "Silver at", value: "300 pts (~3 orders)" },
      { label: "Platinum at", value: "1 500 pts (~10 orders)" },
      { label: "Est. cost / 100 orders", value: "~R960 / month" },
    ],
    values: {
      pts_qr_scan: 25,
      pts_per_r100_online: 10,
      pts_per_r100_retail: 4,
      online_bonus_pct: 150,
      pts_referral_referrer: 400,
      pts_referral_referee: 200,
      pts_streak_bonus: 500,
      streak_interval: 3,
      pts_birthday: 200,
      pts_profile_complete: 100,
      pts_phone_verify: 100,
      mult_bronze: 1.0,
      mult_silver: 1.5,
      mult_gold: 2.5,
      mult_platinum: 4.0,
      threshold_silver: 300,
      threshold_gold: 750,
      threshold_platinum: 1500,
      redemption_value_zar: 0.2,
      min_pts_to_redeem: 50,
      max_redeem_pct_per_order: 30,
      breakage_rate: 0.2,
      pts_expiry_months: 36,
      max_scans_per_qr: 1,
      qr_validity_months: 18,
      referral_min_order_zar: 100,
    },
  },
];

function getTierLabel(pts, cfg) {
  if (pts >= cfg.threshold_platinum) return "Platinum";
  if (pts >= cfg.threshold_gold) return "Gold";
  if (pts >= cfg.threshold_silver) return "Silver";
  return "Bronze";
}
function getTierMult(tier, cfg) {
  const map = {
    Bronze: cfg.mult_bronze,
    Silver: cfg.mult_silver,
    Gold: cfg.mult_gold,
    Platinum: cfg.mult_platinum,
  };
  return map[tier] || 1.0;
}
const TIER_COLOURS = {
  Bronze: { bg: "#FFF3E0", text: "#E65100", border: "#FFCC80" },
  Silver: { bg: "#F5F5F5", text: "#424242", border: "#BDBDBD" },
  Gold: { bg: "#FFFDE7", text: "#F57F17", border: "#FFD54F" },
  Platinum: { bg: "#F3E5F5", text: "#6A1B9A", border: "#CE93D8" },
};

function SectionCard({ title, subtitle, children, accent }) {
  const ac = accent || C.green;
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        marginBottom: 20,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${ac}10, ${ac}04)`,
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px",
          borderLeft: `4px solid ${ac}`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 17,
            fontWeight: 600,
            color: C.green,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 12,
              color: C.textLight,
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, explanation, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 600,
            color: C.text,
            minWidth: 200,
          }}
        >
          {label}
        </div>
        {children}
      </div>
      {explanation && (
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 12,
            color: C.textLight,
            marginTop: 6,
            lineHeight: 1.55,
            borderLeft: `2px solid ${C.border}`,
            paddingLeft: 10,
          }}
        >
          {explanation}
        </div>
      )}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix = "",
  width = 80,
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width,
          padding: "7px 10px",
          border: `1.5px solid ${C.borderDark}`,
          borderRadius: 6,
          fontFamily: FONT_BODY,
          fontSize: 14,
          fontWeight: 600,
          color: C.green,
          background: C.white,
          outline: "none",
          textAlign: "center",
        }}
      />
      {suffix && (
        <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textMid }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function InfoBox({ children, colour, bgColour }) {
  const co = colour || C.blue,
    bg = bgColour || C.bluePale;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${co}30`,
        borderRadius: 8,
        padding: "12px 16px",
        fontFamily: FONT_BODY,
        fontSize: 12.5,
        color: C.textMid,
        lineHeight: 1.6,
        marginTop: 12,
      }}
    >
      {children}
    </div>
  );
}

function PreviewBox({ children, title }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.greenPale}, #f0faf0)`,
        border: `1px solid ${C.greenLight}50`,
        borderRadius: 8,
        padding: "14px 16px",
        marginTop: 14,
      }}
    >
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 11,
          fontWeight: 700,
          color: C.greenMid,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        {title || "Live Preview"}
      </div>
      {children}
    </div>
  );
}

function PreviewLine({ label, value, highlight }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 4,
      }}
    >
      <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textMid }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: FONT_BODY,
          fontSize: 13,
          fontWeight: highlight ? 700 : 500,
          color: highlight ? C.green : C.textMid,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 30,
        right: 30,
        zIndex: 9999,
        background: type === "error" ? C.red : C.green,
        color: C.white,
        padding: "14px 22px",
        borderRadius: 10,
        fontFamily: FONT_BODY,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}
    >
      {type === "error" ? "✗ " : "✓ "}
      {msg}
    </div>
  );
}

function TabSchema({ config, onApplySchema, applyingSchema }) {
  const activeSchemaId = config?.active_schema || "standard";
  const [confirmSchema, setConfirmSchema] = useState(null);
  const COMPARISON_ROWS = [
    { label: "QR scan", key: "pts_qr_scan", format: (v) => `${v} pts` },
    {
      label: "Per R100 online",
      key: "pts_per_r100_online",
      format: (v) => `${v} pts`,
    },
    { label: "Online bonus", key: "online_bonus_pct", format: (v) => `+${v}%` },
    {
      label: "Per R100 retail",
      key: "pts_per_r100_retail",
      format: (v) => `${v} pts`,
    },
    {
      label: "Referral (referrer)",
      key: "pts_referral_referrer",
      format: (v) => `${v} pts`,
    },
    {
      label: "Referral (referee)",
      key: "pts_referral_referee",
      format: (v) => `${v} pts`,
    },
    {
      label: "Streak bonus",
      key: "pts_streak_bonus",
      format: (v) => `${v} pts`,
    },
    {
      label: "Streak interval",
      key: "streak_interval",
      format: (v) => `every ${v} scans`,
    },
    { label: "Birthday bonus", key: "pts_birthday", format: (v) => `${v} pts` },
    {
      label: "Profile complete",
      key: "pts_profile_complete",
      format: (v) => `${v} pts`,
    },
    {
      label: "Silver tier at",
      key: "threshold_silver",
      format: (v) => `${v} pts`,
    },
    { label: "Gold tier at", key: "threshold_gold", format: (v) => `${v} pts` },
    {
      label: "Platinum tier at",
      key: "threshold_platinum",
      format: (v) => `${v} pts`,
    },
    {
      label: "Platinum multiplier",
      key: "mult_platinum",
      format: (v) => `${v}×`,
    },
    {
      label: "1 pt redeemable for",
      key: "redemption_value_zar",
      format: (v) => `R${v.toFixed(2)}`,
    },
    {
      label: "Min pts to redeem",
      key: "min_pts_to_redeem",
      format: (v) => `${v} pts`,
    },
    {
      label: "Max redeem % order",
      key: "max_redeem_pct_per_order",
      format: (v) => `${v}%`,
    },
    {
      label: "Points expiry",
      key: "pts_expiry_months",
      format: (v) => `${v} months`,
    },
  ];
  const ONBOARDING = [
    {
      icon: "🔄",
      title: "How live updates work",
      body: "Every page in the platform — ScanResult, CheckoutPage, OrderSuccess, Loyalty dashboard and Redeem — reads from the loyalty_config table on each load. When you apply a schema, all values are written to the database in a single operation. All existing customer tiers are immediately recalculated. No server restart required.",
    },
    {
      icon: "💰",
      title: "Understanding cost per point",
      body: "The 'cost per point' figure shown on each schema card is the expected actual cash cost to Protea Botanicals per point issued, after accounting for breakage (points that expire or are never redeemed). Formula: redemption_value_zar × (1 − breakage_rate). Conservative: R0.10 × 0.65 = R0.065. Standard: R0.15 × 0.75 = R0.11. Aggressive: R0.20 × 0.80 = R0.16.",
    },
    {
      icon: "📊",
      title: "Online bonus vs retail",
      body: "The online_bonus_pct gives direct website purchasers more points than retail customers who scan a QR in a dispensary. This incentivises buying directly from you (higher margin) vs. through a retail partner. Standard schema gives 100% extra online — meaning a direct customer earns double what a retail customer earns on the same spend.",
    },
    {
      icon: "🏆",
      title: "Tier multipliers",
      body: "Multipliers apply to ALL earned points — scans, purchases, referrals and streak bonuses. A Platinum customer at 3× earns triple points on every interaction. This is the single most powerful retention tool: once a customer reaches Platinum tier, downgrading to a competitor means losing their multiplier advantage.",
    },
    {
      icon: "📉",
      title: "Breakage rate",
      body: "Breakage is the percentage of issued points that are never redeemed (expired, dormant accounts, customers who forget). Industry average is 20–35%. A higher breakage rate lowers your actual programme cost. Conservative schema assumes 35% breakage; Aggressive assumes 20% (because higher-value rewards drive more active redemption).",
    },
    {
      icon: "🔒",
      title: "Schema + manual override",
      body: "Applying a schema sets all values at once — useful for a clean baseline. After applying, you can fine-tune any individual value using the tabs above (Earning Rules, Tiers, Economics, etc.) without affecting other values. Manual overrides save separately via 'Save All Changes'. The active_schema label will show 'custom' once you deviate from a preset.",
    },
  ];
  return (
    <div>
      <div
        style={{
          background: `linear-gradient(135deg, ${C.green}08, ${C.greenLight}06)`,
          border: `1px solid ${C.greenLight}40`,
          borderRadius: 12,
          padding: "18px 22px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 20,
            fontWeight: 600,
            color: C.green,
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          One-Click Loyalty Schema Selection
          <InfoTooltip id="loyalty-schema" />
        </div>
        <div
          style={{
            fontFamily: FONT_BODY,
            fontSize: 13,
            color: C.textMid,
            lineHeight: 1.7,
            maxWidth: 700,
          }}
        >
          Choose a pre-calibrated rewards level. Clicking <strong>Apply</strong>{" "}
          writes all values to the database — scans, purchases, referrals,
          tiers, redemptions and bonuses all update simultaneously. All existing
          customer tiers are immediately recalculated to match the new
          thresholds.
        </div>
        <div
          style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          {[
            "✅ QR scans",
            "✅ Online purchases",
            "✅ Referral rewards",
            "✅ Streak bonuses",
            "✅ Tier multipliers",
            "✅ Redemption values",
            "✅ Expiry rules",
            "✅ All tiers recalculated",
          ].map((tag) => (
            <span
              key={tag}
              style={{
                background: C.greenPale,
                color: C.greenMid,
                border: `1px solid ${C.greenLight}40`,
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: 20,
          marginBottom: 32,
        }}
      >
        {SCHEMAS.map((schema) => {
          const active = activeSchemaId === schema.id;
          return (
            <div
              key={schema.id}
              style={{
                background: active ? `${schema.costColor}06` : C.card,
                border: `2px solid ${active ? schema.costColor : C.border}`,
                borderRadius: 14,
                overflow: "hidden",
                transition: "all 0.2s",
                boxShadow: active ? `0 4px 20px ${schema.costColor}20` : "none",
              }}
            >
              <div
                style={{
                  background: active
                    ? schema.costColor
                    : `${schema.costColor}12`,
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 26 }}>{schema.icon}</span>
                    <div>
                      <div
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontSize: 22,
                          fontWeight: 700,
                          color: active ? C.white : C.text,
                        }}
                      >
                        {schema.label}
                      </div>
                      <div
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 11,
                          color: active ? "rgba(255,255,255,0.8)" : C.textLight,
                          marginTop: 1,
                        }}
                      >
                        {schema.tagline}
                      </div>
                    </div>
                  </div>
                  {active && (
                    <span
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        color: C.white,
                        borderRadius: 20,
                        padding: "3px 12px",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ✓ ACTIVE
                    </span>
                  )}
                </div>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <div
                  style={{
                    display: "inline-block",
                    background: schema.costBg,
                    color: schema.costColor,
                    border: `1px solid ${schema.costColor}30`,
                    borderRadius: 20,
                    padding: "4px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  💰 {schema.costBadge}
                </div>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 12.5,
                    color: C.textMid,
                    lineHeight: 1.65,
                    marginBottom: 14,
                  }}
                >
                  {schema.description}
                </div>
                <div
                  style={{
                    background: C.bg,
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 16,
                  }}
                >
                  {schema.preview.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: i < schema.preview.length - 1 ? 7 : 0,
                        paddingBottom: i < schema.preview.length - 1 ? 7 : 0,
                        borderBottom:
                          i < schema.preview.length - 1
                            ? `1px solid ${C.border}`
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 12,
                          color: C.textMid,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 12,
                          fontWeight: 700,
                          color: schema.costColor,
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                {confirmSchema === schema.id ? (
                  <div>
                    <div
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 12,
                        color: C.textMid,
                        marginBottom: 10,
                        background: `${schema.costColor}10`,
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: `1px solid ${schema.costColor}30`,
                      }}
                    >
                      This will overwrite all current loyalty settings and
                      immediately recalculate all customer tiers. Confirm?
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          setConfirmSchema(null);
                          onApplySchema(schema);
                        }}
                        disabled={applyingSchema}
                        style={{
                          flex: 2,
                          padding: "9px",
                          background: schema.costColor,
                          color: C.white,
                          border: "none",
                          borderRadius: 7,
                          fontFamily: FONT_BODY,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {applyingSchema ? "Applying…" : "✓ Confirm Apply"}
                      </button>
                      <button
                        onClick={() => setConfirmSchema(null)}
                        style={{
                          flex: 1,
                          padding: "9px",
                          background: "none",
                          border: `1px solid ${C.border}`,
                          borderRadius: 7,
                          fontFamily: FONT_BODY,
                          fontSize: 12,
                          color: C.textMid,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      active ? null : setConfirmSchema(schema.id)
                    }
                    disabled={active || applyingSchema}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: active
                        ? `${schema.costColor}15`
                        : schema.costColor,
                      color: active ? schema.costColor : C.white,
                      border: `1.5px solid ${schema.costColor}`,
                      borderRadius: 8,
                      fontFamily: FONT_BODY,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: active ? "default" : "pointer",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {active
                      ? "✓ Currently Active"
                      : `Apply ${schema.label} Schema`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <SectionCard
        title="Full Schema Comparison"
        subtitle="All values across all three schemas"
        accent={C.purple}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: FONT_BODY,
              fontSize: 12.5,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: C.textLight,
                    textTransform: "uppercase",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    borderBottom: `2px solid ${C.border}`,
                    background: C.bg,
                  }}
                >
                  Setting
                </th>
                {SCHEMAS.map((s) => (
                  <th
                    key={s.id}
                    style={{
                      padding: "10px 14px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: s.costColor,
                      fontSize: 13,
                      borderBottom: `2px solid ${s.costColor}40`,
                      background: `${s.costColor}05`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.icon} {s.label}
                    {activeSchemaId === s.id && (
                      <span
                        style={{
                          display: "block",
                          fontSize: 9,
                          letterSpacing: "0.1em",
                          opacity: 0.7,
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr
                  key={row.key}
                  style={{ background: i % 2 === 0 ? C.bg : C.white }}
                >
                  <td
                    style={{
                      padding: "9px 14px",
                      color: C.textMid,
                      fontWeight: 500,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {row.label}
                  </td>
                  {SCHEMAS.map((s) => {
                    const val = s.values[row.key],
                      isActive = activeSchemaId === s.id;
                    return (
                      <td
                        key={s.id}
                        style={{
                          padding: "9px 14px",
                          textAlign: "center",
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? s.costColor : C.textMid,
                          borderBottom: `1px solid ${C.border}`,
                          background: isActive
                            ? `${s.costColor}05`
                            : "transparent",
                        }}
                      >
                        {row.format(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard
        title="Understanding Each Setting"
        subtitle="What these values control across the platform"
        accent={C.gold}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {ONBOARDING.map((item, i) => (
            <div
              key={i}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.text,
                  }}
                >
                  {item.title}
                </div>
              </div>
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 12,
                  color: C.textMid,
                  lineHeight: 1.65,
                }}
              >
                {item.body}
              </div>
            </div>
          ))}
        </div>
        <InfoBox colour={C.gold} bgColour={C.goldPale}>
          <strong>Pro tip:</strong> Apply a schema first to get a clean
          baseline, then use the <strong>Earning Rules</strong>,{" "}
          <strong>Tiers</strong>, and <strong>Economics</strong> tabs to tweak
          individual values. Each tab shows live previews of what a customer
          would experience at the current settings.
        </InfoBox>
      </SectionCard>
    </div>
  );
}

function TabEarning({ draft, setDraft }) {
  const cfg = draft;
  const costPerPt = cfg.redemption_value_zar * (1 - cfg.breakage_rate);
  const baseOnline = (400 / 100) * cfg.pts_per_r100_online;
  const withBonus = baseOnline * (1 + cfg.online_bonus_pct / 100);
  const withTier = withBonus * cfg.mult_gold;
  const ptsFinal = Math.round(withTier);
  const zarValue = ptsFinal * cfg.redemption_value_zar;
  const zarCost = ptsFinal * costPerPt;
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div>
      <SectionCard
        title="QR Scan — Product Inside Packaging"
        subtitle="Points awarded when customer scans a product QR code"
      >
        <FieldRow
          label="Points per scan"
          explanation={`Each physical product QR earns points once only. At current settings, one scan earns ${cfg.pts_qr_scan} pts = R${(cfg.pts_qr_scan * costPerPt).toFixed(2)} actual cost to Protea (after ${Math.round(cfg.breakage_rate * 100)}% breakage).`}
        >
          <NumInput
            value={cfg.pts_qr_scan}
            onChange={(v) => setField("pts_qr_scan", v)}
            min={0}
            max={500}
            suffix="pts per scan"
          />
        </FieldRow>
      </SectionCard>
      <SectionCard
        title="Online Purchase — Direct from Website"
        subtitle="Your highest-margin channel."
        accent={C.greenMid}
      >
        <FieldRow
          label="Points per R100 spent"
          explanation={`A R400 online order earns ${(4 * cfg.pts_per_r100_online).toFixed(1)} base points before bonus and tier multiplier.`}
        >
          <NumInput
            value={cfg.pts_per_r100_online}
            onChange={(v) => setField("pts_per_r100_online", v)}
            min={0}
            max={20}
            step={0.5}
            suffix="pts / R100"
          />
        </FieldRow>
        <FieldRow
          label="Online bonus"
          explanation={`Online purchases earn ${cfg.online_bonus_pct}% MORE points than retail scans.`}
        >
          <NumInput
            value={cfg.online_bonus_pct}
            onChange={(v) => setField("online_bonus_pct", v)}
            min={0}
            max={300}
            step={5}
            suffix="% extra vs retail"
          />
        </FieldRow>
        <PreviewBox title="Live Preview — R400 Online Order, Gold Tier Customer">
          <PreviewLine
            label={`Base: 400/100 × ${cfg.pts_per_r100_online} pts`}
            value={`${baseOnline.toFixed(1)} pts`}
          />
          <PreviewLine
            label={`Online bonus +${cfg.online_bonus_pct}%`}
            value={`× ${(1 + cfg.online_bonus_pct / 100).toFixed(2)} = ${withBonus.toFixed(1)} pts`}
          />
          <PreviewLine
            label={`Gold tier multiplier ${cfg.mult_gold}×`}
            value={`× ${cfg.mult_gold} = ${withTier.toFixed(1)} pts`}
          />
          <div
            style={{ borderTop: `1px solid ${C.border}`, margin: "8px 0" }}
          />
          <PreviewLine
            label="Points earned"
            value={`${ptsFinal} pts`}
            highlight
          />
          <PreviewLine
            label="Value to customer"
            value={`R${zarValue.toFixed(2)}`}
          />
          <PreviewLine
            label="Cost to Protea (after breakage)"
            value={`R${zarCost.toFixed(2)} (${((zarCost / 400) * 100).toFixed(2)}% of order)`}
          />
        </PreviewBox>
      </SectionCard>
      <SectionCard
        title="Retail Scan"
        subtitle="Keep lower than online to incentivise direct purchasing"
        accent={C.amber}
      >
        <FieldRow label="Points per R100 equivalent">
          <NumInput
            value={cfg.pts_per_r100_retail}
            onChange={(v) => setField("pts_per_r100_retail", v)}
            min={0}
            max={10}
            step={0.5}
            suffix="pts / R100"
          />
        </FieldRow>
      </SectionCard>
      <SectionCard
        title="Streak & Birthday Bonuses"
        subtitle="Bonus points for consistent scanning behaviour and birthdays"
        accent={C.purple}
      >
        <FieldRow
          label="Streak bonus points"
          explanation={`Customer earns this bonus after scanning ${cfg.streak_interval} times in a row. Currently wired in ScanResult.js.`}
        >
          <NumInput
            value={cfg.pts_streak_bonus || 200}
            onChange={(v) => setField("pts_streak_bonus", v)}
            min={0}
            max={2000}
            step={50}
            suffix="pts per streak"
          />
        </FieldRow>
        <FieldRow
          label="Scans per streak"
          explanation="How many scans trigger the streak bonus."
        >
          <NumInput
            value={cfg.streak_interval || 5}
            onChange={(v) => setField("streak_interval", v)}
            min={2}
            max={20}
            step={1}
            suffix="scans"
          />
        </FieldRow>
        <FieldRow
          label="Birthday bonus"
          explanation="Points auto-awarded on customer's birthday (requires pg_cron — pending Supabase Pro upgrade)."
        >
          <NumInput
            value={cfg.pts_birthday || 100}
            onChange={(v) => setField("pts_birthday", v)}
            min={0}
            max={1000}
            step={25}
            suffix="pts"
          />
        </FieldRow>
      </SectionCard>
      <SectionCard
        title="Profile Completion Rewards"
        subtitle="Already live in Account.js"
        accent={C.blue}
      >
        <FieldRow label="Profile completion bonus">
          <NumInput
            value={cfg.pts_profile_complete}
            onChange={(v) => setField("pts_profile_complete", v)}
            min={0}
            max={500}
            suffix="pts"
          />
        </FieldRow>
        <FieldRow label="Phone OTP verification">
          <NumInput
            value={cfg.pts_phone_verify}
            onChange={(v) => setField("pts_phone_verify", v)}
            min={0}
            max={500}
            suffix="pts"
          />
        </FieldRow>
      </SectionCard>
    </div>
  );
}

function TabTiers({ draft, setDraft }) {
  const cfg = draft;
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const tiers = [
    {
      name: "Bronze",
      threshold: 0,
      multKey: "mult_bronze",
      thKey: null,
      colour: TIER_COLOURS.Bronze,
    },
    {
      name: "Silver",
      threshold: cfg.threshold_silver,
      multKey: "mult_silver",
      thKey: "threshold_silver",
      colour: TIER_COLOURS.Silver,
    },
    {
      name: "Gold",
      threshold: cfg.threshold_gold,
      multKey: "mult_gold",
      thKey: "threshold_gold",
      colour: TIER_COLOURS.Gold,
    },
    {
      name: "Platinum",
      threshold: cfg.threshold_platinum,
      multKey: "mult_platinum",
      thKey: "threshold_platinum",
      colour: TIER_COLOURS.Platinum,
    },
  ];
  function weeksToTier(targetPts) {
    return Math.ceil(targetPts / cfg.pts_qr_scan);
  }
  function monthsToTierBuying(targetPts) {
    const ptsPerMonth =
      (400 / 100) * cfg.pts_per_r100_online * (1 + cfg.online_bonus_pct / 100);
    return Math.ceil(targetPts / ptsPerMonth);
  }
  const platBuying =
    (400 / 100) *
    cfg.pts_per_r100_online *
    (1 + cfg.online_bonus_pct / 100) *
    cfg.mult_platinum;
  const bronzeBuying =
    (400 / 100) *
    cfg.pts_per_r100_online *
    (1 + cfg.online_bonus_pct / 100) *
    cfg.mult_bronze;
  return (
    <div>
      <SectionCard title="Tier Thresholds & Multipliers">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 20,
          }}
        >
          {tiers.map((tier) => (
            <div
              key={tier.name}
              style={{
                background: tier.colour.bg,
                border: `1.5px solid ${tier.colour.border}`,
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20,
                  fontWeight: 700,
                  color: tier.colour.text,
                  marginBottom: 12,
                }}
              >
                {tier.name}
              </div>
              {tier.thKey ? (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 11,
                      color: C.textLight,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Reaches at
                  </div>
                  <NumInput
                    value={cfg[tier.thKey]}
                    onChange={(v) => setField(tier.thKey, v)}
                    min={1}
                    max={10000}
                    step={50}
                    suffix="pts"
                    width={90}
                  />
                </div>
              ) : (
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 12,
                    color: C.textLight,
                    marginBottom: 12,
                  }}
                >
                  Starting tier (0 pts)
                </div>
              )}
              <div>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    color: C.textLight,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Earn multiplier
                </div>
                <NumInput
                  value={cfg[tier.multKey]}
                  onChange={(v) => setField(tier.multKey, v)}
                  min={1.0}
                  max={5.0}
                  step={0.05}
                  suffix="×"
                  width={70}
                />
              </div>
            </div>
          ))}
        </div>
        <PreviewBox title="Tier Journey Visualiser">
          {[
            { label: "Bronze → Silver", pts: cfg.threshold_silver },
            { label: "Silver → Gold", pts: cfg.threshold_gold },
            { label: "Gold → Platinum", pts: cfg.threshold_platinum },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                marginBottom: 10,
                paddingBottom: 10,
                borderBottom: i < 2 ? `1px solid ${C.border}` : "none",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.textMid,
                  marginBottom: 3,
                }}
              >
                {step.label} — {step.pts} pts
              </div>
              <div
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 12,
                  color: C.textLight,
                }}
              >
                Scanning once/week: ~{weeksToTier(step.pts)} weeks &nbsp;·&nbsp;
                Buying R400/month online: ~{monthsToTierBuying(step.pts)} months
              </div>
            </div>
          ))}
        </PreviewBox>
      </SectionCard>
      <SectionCard title="Multiplier Impact" accent={C.purple}>
        <InfoBox colour={C.purple} bgColour={C.purplePale}>
          <strong>Platinum vs Bronze on R400/month online:</strong>
          <br />• Bronze (1×): {Math.round(bronzeBuying)} pts/month = R
          {(Math.round(bronzeBuying) * cfg.redemption_value_zar).toFixed(2)}
          /month value
          <br />• Platinum ({cfg.mult_platinum}×): {Math.round(platBuying)}{" "}
          pts/month = R
          {(Math.round(platBuying) * cfg.redemption_value_zar).toFixed(2)}/month
          value
          <br />• Difference: +{Math.round(platBuying - bronzeBuying)} pts/month
        </InfoBox>
      </SectionCard>
    </div>
  );
}

function TabEconomics({ draft, setDraft, liveStats }) {
  const cfg = draft;
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const costPerPt = cfg.redemption_value_zar * (1 - cfg.breakage_rate);
  const outstandingLiability = liveStats
    ? liveStats.totalPtsIssued * cfg.redemption_value_zar
    : 0;
  const actualRedemptionRate =
    liveStats && liveStats.totalPtsIssued > 0
      ? ((liveStats.totalPtsRedeemed / liveStats.totalPtsIssued) * 100).toFixed(
          1,
        )
      : "0.0";
  const programmeCost = liveStats
    ? liveStats.totalPtsRedeemed * cfg.redemption_value_zar
    : 0;
  const costAsPctRev =
    liveStats && liveStats.totalRevenue > 0
      ? ((programmeCost / liveStats.totalRevenue) * 100).toFixed(2)
      : "0.00";
  return (
    <div>
      <SectionCard title="Redemption Settings">
        <FieldRow label="1 point = R___ value to customer">
          <NumInput
            value={cfg.redemption_value_zar}
            onChange={(v) => setField("redemption_value_zar", v)}
            min={0.01}
            max={1.0}
            step={0.01}
            suffix="ZAR per point"
            width={80}
          />
        </FieldRow>
        <FieldRow label="Minimum points to redeem">
          <NumInput
            value={cfg.min_pts_to_redeem}
            onChange={(v) => setField("min_pts_to_redeem", v)}
            min={1}
            max={1000}
            step={10}
            suffix="pts"
          />
        </FieldRow>
        <FieldRow label="Max % of order payable with points">
          <NumInput
            value={cfg.max_redeem_pct_per_order}
            onChange={(v) => setField("max_redeem_pct_per_order", v)}
            min={1}
            max={100}
            step={5}
            suffix="% of order value"
          />
        </FieldRow>
        <FieldRow label="Points expiry">
          <NumInput
            value={cfg.pts_expiry_months}
            onChange={(v) => setField("pts_expiry_months", v)}
            min={0}
            max={60}
            step={6}
            suffix="months (0 = never)"
            width={80}
          />
        </FieldRow>
      </SectionCard>
      <SectionCard title="Financial Model" accent={C.purple}>
        <FieldRow
          label={
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              Expected breakage rate <InfoTooltip id="loyalty-breakage" />
            </span>
          }
        >
          <NumInput
            value={cfg.breakage_rate * 100}
            onChange={(v) => setField("breakage_rate", v / 100)}
            min={0}
            max={80}
            step={5}
            suffix="% never redeemed"
          />
        </FieldRow>
        <PreviewBox title="Calculated Cost Per Point Issued">
          <PreviewLine
            label="Redemption value"
            value={`R${cfg.redemption_value_zar.toFixed(2)} per point`}
          />
          <PreviewLine
            label={`Less breakage (${Math.round(cfg.breakage_rate * 100)}%)`}
            value={`× ${(1 - cfg.breakage_rate).toFixed(2)}`}
          />
          <div
            style={{ borderTop: `1px solid ${C.border}`, margin: "8px 0" }}
          />
          <PreviewLine
            label="Actual cost per point issued"
            value={`R${costPerPt.toFixed(3)}`}
            highlight
          />
        </PreviewBox>
      </SectionCard>
      <SectionCard title="Programme Cost Dashboard" accent={C.greenMid}>
        {liveStats ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                label: "Points Issued (30d)",
                value: liveStats.totalPtsIssued30d?.toLocaleString() || "0",
                colour: C.green,
              },
              {
                label: "Points Redeemed (30d)",
                value: liveStats.totalPtsRedeemed30d?.toLocaleString() || "0",
                colour: C.purple,
              },
              {
                label: "Redemption Rate",
                value: `${actualRedemptionRate}%`,
                colour: C.amber,
              },
              {
                label: "Outstanding Liability",
                value: `R${outstandingLiability.toFixed(0)}`,
                colour: C.red,
              },
              {
                label: "Programme Cost",
                value: `R${programmeCost.toFixed(0)}`,
                colour: C.textMid,
              },
              {
                label: "Cost as % Revenue",
                value: `${costAsPctRev}%`,
                colour: C.greenMid,
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: C.white,
                  border: `1px solid ${s.colour}25`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 20,
                    fontWeight: 700,
                    color: s.colour,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    color: C.textLight,
                    marginTop: 2,
                    lineHeight: 1.3,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.textLight,
              textAlign: "center",
              padding: 30,
            }}
          >
            Loading live transaction data...
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function TabReferrals({ draft, setDraft, referralLeaderboard }) {
  const cfg = draft;
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div>
      <SectionCard title="Referral Programme Settings">
        <FieldRow label="Points to the referrer">
          <NumInput
            value={cfg.pts_referral_referrer}
            onChange={(v) => setField("pts_referral_referrer", v)}
            min={0}
            max={1000}
            step={10}
            suffix="pts per referral"
          />
        </FieldRow>
        <FieldRow label="Points to the new customer">
          <NumInput
            value={cfg.pts_referral_referee}
            onChange={(v) => setField("pts_referral_referee", v)}
            min={0}
            max={500}
            step={10}
            suffix="pts for new customer"
          />
        </FieldRow>
        <FieldRow label="Minimum order to qualify">
          <NumInput
            value={cfg.referral_min_order_zar}
            onChange={(v) => setField("referral_min_order_zar", v)}
            min={0}
            max={500}
            step={10}
            suffix="R minimum order"
          />
        </FieldRow>
      </SectionCard>
      <SectionCard title="Top Referrers" accent={C.purple}>
        {referralLeaderboard && referralLeaderboard.length > 0 ? (
          referralLeaderboard.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: i === 0 ? C.purplePale : C.bg,
                borderRadius: 8,
                marginBottom: 6,
                border: `1px solid ${i === 0 ? C.purple + "30" : C.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: i === 0 ? C.purple : C.textLight,
                    color: C.white,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT_BODY,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text,
                    }}
                  >
                    {entry.name || entry.code}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 11,
                      color: C.textLight,
                    }}
                  >
                    Code: {entry.code}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.purple,
                  }}
                >
                  {entry.uses_count} referrals
                </div>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    color: C.textLight,
                  }}
                >
                  +{entry.uses_count * cfg.pts_referral_referrer} pts earned
                </div>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.textLight,
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No referral data yet.
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function TabQRSecurity({ draft, setDraft, qrStats }) {
  const cfg = draft;
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div>
      <SectionCard title="QR Code Security Controls">
        <FieldRow label="Max scans per product QR">
          <NumInput
            value={cfg.max_scans_per_qr}
            onChange={(v) => setField("max_scans_per_qr", v)}
            min={1}
            max={10}
            suffix="scan(s) per QR"
          />
        </FieldRow>
        <FieldRow label="QR code validity period">
          <NumInput
            value={cfg.qr_validity_months}
            onChange={(v) => setField("qr_validity_months", v)}
            min={1}
            max={60}
            step={3}
            suffix="months"
          />
        </FieldRow>
      </SectionCard>
      {qrStats && (
        <SectionCard title="Live QR Stats" accent={C.blue}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                label: "Total Active QR Codes",
                value: qrStats.total?.toLocaleString() || "0",
                colour: C.green,
              },
              {
                label: "Claimed (Scanned Once)",
                value: qrStats.claimed?.toLocaleString() || "0",
                colour: C.purple,
              },
              {
                label: "Claim Rate",
                value: `${qrStats.total > 0 ? ((qrStats.claimed / qrStats.total) * 100).toFixed(1) : 0}%`,
                colour: C.amber,
              },
              {
                label: "Expired",
                value: qrStats.expired?.toLocaleString() || "0",
                colour: C.textLight,
              },
              {
                label: "Invalid Attempts Today",
                value: qrStats.invalidToday?.toLocaleString() || "0",
                colour: C.red,
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: C.white,
                  border: `1px solid ${s.colour}25`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 22,
                    fontWeight: 700,
                    color: s.colour,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    color: C.textLight,
                    marginTop: 2,
                    lineHeight: 1.3,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function TabSimulator({ draft }) {
  const cfg = draft;
  const [onlinePct, setOnlinePct] = useState(30);
  const [aov, setAov] = useState(400);
  const [unitsMo, setUnitsMo] = useState(100);
  const [targetPct, setTargetPct] = useState(50);
  const COGS_PER_UNIT = 103,
    WHOLESALE_PRICE = 280;
  const costPerPt = cfg.redemption_value_zar * (1 - cfg.breakage_rate);
  const ptsPerOnlineOrder = Math.round(
    (aov / 100) * cfg.pts_per_r100_online * (1 + cfg.online_bonus_pct / 100),
  );
  const ptsPerRetailScan = Math.round((aov / 100) * cfg.pts_per_r100_retail);
  function calcScenario(onlineShare) {
    const onlineUnits = Math.round((unitsMo * onlineShare) / 100),
      retailUnits = unitsMo - onlineUnits;
    const onlineRev = onlineUnits * aov,
      retailRev = retailUnits * WHOLESALE_PRICE,
      totalRev = onlineRev + retailRev;
    const onlineMargin = onlineUnits * (aov - COGS_PER_UNIT),
      retailMargin = retailUnits * (WHOLESALE_PRICE - COGS_PER_UNIT),
      totalMargin = onlineMargin + retailMargin;
    const marginPct = totalRev > 0 ? (totalMargin / totalRev) * 100 : 0;
    const loyaltyCost =
      (onlineUnits * ptsPerOnlineOrder + retailUnits * ptsPerRetailScan) *
      costPerPt;
    const netMargin = totalMargin - loyaltyCost;
    const netMarginPct = totalRev > 0 ? (netMargin / totalRev) * 100 : 0;
    return {
      onlineUnits,
      retailUnits,
      onlineRev,
      retailRev,
      totalRev,
      totalMargin,
      marginPct,
      loyaltyCost,
      netMargin,
      netMarginPct,
    };
  }
  const current = calcScenario(onlinePct),
    target = calcScenario(targetPct),
    gain = target.netMargin - current.netMargin;
  return (
    <div>
      <SectionCard
        title="Channel Mix Simulator"
        subtitle="Drag sliders to model different channel splits — all figures recalculate live"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <FieldRow label="Average order value">
            <NumInput
              value={aov}
              onChange={setAov}
              min={50}
              max={2000}
              step={50}
              suffix="R"
              width={90}
            />
          </FieldRow>
          <FieldRow label="Units sold / month">
            <NumInput
              value={unitsMo}
              onChange={setUnitsMo}
              min={1}
              max={10000}
              step={10}
              suffix="units"
              width={90}
            />
          </FieldRow>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.textMid,
              marginBottom: 6,
            }}
          >
            <strong>Current:</strong> {onlinePct}% online
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={onlinePct}
            onChange={(e) => setOnlinePct(parseInt(e.target.value))}
            style={{
              width: "100%",
              accentColor: C.greenMid,
              cursor: "pointer",
            }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.textMid,
              marginBottom: 6,
            }}
          >
            <strong>Target:</strong> {targetPct}% online
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={targetPct}
            onChange={(e) => setTargetPct(parseInt(e.target.value))}
            style={{ width: "100%", accentColor: C.purple, cursor: "pointer" }}
          />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            {
              title: `Current — ${onlinePct}% Online`,
              data: current,
              colour: C.amber,
              showGain: false,
            },
            {
              title: `Target — ${targetPct}% Online`,
              data: target,
              colour: C.greenMid,
              showGain: true,
            },
          ].map((s, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                minWidth: 260,
                background: C.white,
                border: `2px solid ${s.colour}40`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div style={{ background: s.colour, padding: "10px 16px" }}>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 16,
                    fontWeight: 600,
                    color: C.white,
                  }}
                >
                  {s.title}
                </div>
              </div>
              <div style={{ padding: "14px 16px" }}>
                {[
                  {
                    label: "Monthly Revenue",
                    value: `R${s.data.totalRev.toLocaleString()}`,
                  },
                  {
                    label: "Total Net Margin",
                    value: `R${s.data.totalMargin.toLocaleString()} (${s.data.marginPct.toFixed(1)}%)`,
                  },
                  {
                    label: "Loyalty Cost / mo",
                    value: `R${s.data.loyaltyCost.toFixed(0)}`,
                  },
                  {
                    label: "Net After Loyalty",
                    value: `R${s.data.netMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${s.data.netMarginPct.toFixed(1)}%)`,
                    bold: true,
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      paddingBottom: 5,
                      borderBottom: i < 3 ? `1px solid ${C.border}` : "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 12,
                        color: C.textMid,
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 13,
                        fontWeight: row.bold ? 700 : 500,
                        color: C.text,
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
                {s.showGain && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: gain > 0 ? C.greenPale : C.redPale,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 13,
                        fontWeight: 700,
                        color: gain > 0 ? C.green : C.red,
                      }}
                    >
                      {gain > 0 ? "▲" : "▼"} {gain > 0 ? "+" : ""}R
                      {Math.abs(gain).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                      /month vs current
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function TabCampaigns({ showToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const EMPTY_FORM = {
    name: "",
    start_date: "",
    end_date: "",
    multiplier: 2.0,
    is_active: true,
  };
  const [form, setForm] = useState(EMPTY_FORM);
  const today = new Date().toISOString().split("T")[0];
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("double_points_campaigns")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      showToast("Failed to load campaigns: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  useEffect(() => {
    load();
  }, [load]);
  function isActive(c) {
    return c.is_active && c.start_date <= today && c.end_date >= today;
  }
  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowForm(true);
  }
  function openEdit(c) {
    setForm({
      name: c.name,
      start_date: c.start_date,
      end_date: c.end_date,
      multiplier: c.multiplier,
      is_active: c.is_active,
    });
    setEditId(c.id);
    setShowForm(true);
  }
  async function handleSave() {
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      showToast("Name, start date and end date are required", "error");
      return;
    }
    if (form.end_date < form.start_date) {
      showToast("End date must be on or after start date", "error");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase
          .from("double_points_campaigns")
          .update({
            name: form.name.trim(),
            start_date: form.start_date,
            end_date: form.end_date,
            multiplier: parseFloat(form.multiplier),
            is_active: form.is_active,
          })
          .eq("id", editId);
        if (error) throw error;
        showToast("Campaign updated");
      } else {
        const { error } = await supabase
          .from("double_points_campaigns")
          .insert({
            name: form.name.trim(),
            start_date: form.start_date,
            end_date: form.end_date,
            multiplier: parseFloat(form.multiplier),
            is_active: form.is_active,
          });
        if (error) throw error;
        showToast("Campaign created");
      }
      setShowForm(false);
      await load();
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }
  async function toggleActive(c) {
    try {
      const { error } = await supabase
        .from("double_points_campaigns")
        .update({ is_active: !c.is_active })
        .eq("id", c.id);
      if (error) throw error;
      showToast(c.is_active ? "Campaign paused" : "Campaign activated");
      await load();
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    }
  }
  async function handleDelete(id) {
    if (!window.confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      const { error } = await supabase
        .from("double_points_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
      showToast("Campaign deleted");
      await load();
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    }
  }
  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: `1.5px solid ${C.borderDark}`,
    borderRadius: 7,
    fontFamily: FONT_BODY,
    fontSize: 14,
    color: C.text,
    background: C.white,
    outline: "none",
    boxSizing: "border-box",
  };
  return (
    <div>
      <SectionCard
        title="Double Points Campaigns"
        subtitle="Create time-limited multiplier events — active campaigns apply automatically at scan time"
        accent={C.gold}
      >
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={openNew}
            style={{
              padding: "10px 22px",
              background: C.green,
              border: "none",
              borderRadius: 8,
              fontFamily: FONT_BODY,
              fontSize: 13,
              fontWeight: 600,
              color: C.white,
              cursor: "pointer",
            }}
          >
            + New Campaign
          </button>
        </div>
        {showForm && (
          <div
            style={{
              background: C.goldPale,
              border: `2px solid ${C.gold}40`,
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 18,
                fontWeight: 600,
                color: C.green,
                marginBottom: 16,
              }}
            >
              {editId ? "Edit Campaign" : "New Campaign"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 14,
                marginBottom: 14,
              }}
            >
              {[
                {
                  label: "Campaign Name *",
                  key: "name",
                  type: "text",
                  placeholder: "e.g. Easter Double Points",
                },
                { label: "Start Date *", key: "start_date", type: "date" },
                {
                  label: "End Date *",
                  key: "end_date",
                  type: "date",
                  min: form.start_date,
                },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      fontFamily: FONT_BODY,
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.textMid,
                      display: "block",
                      marginBottom: 5,
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={form[f.key]}
                    min={f.min}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.textMid,
                    display: "block",
                    marginBottom: 5,
                  }}
                >
                  Points Multiplier
                </label>
                <input
                  type="number"
                  value={form.multiplier}
                  min={1.1}
                  max={10}
                  step={0.1}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, multiplier: e.target.value }))
                  }
                  style={{ ...inputStyle, textAlign: "center" }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <input
                type="checkbox"
                id="camp-active"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((p) => ({ ...p, is_active: e.target.checked }))
                }
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <label
                htmlFor="camp-active"
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  color: C.textMid,
                  cursor: "pointer",
                }}
              >
                Active (will apply at scan time if dates match)
              </label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "9px 22px",
                  background: C.green,
                  border: "none",
                  borderRadius: 7,
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.white,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "Saving…"
                  : editId
                    ? "Update Campaign"
                    : "Create Campaign"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  padding: "9px 18px",
                  background: "none",
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  color: C.textMid,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.textLight,
              textAlign: "center",
              padding: 30,
            }}
          >
            Loading campaigns…
          </div>
        ) : campaigns.length === 0 ? (
          <div
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.textLight,
              textAlign: "center",
              padding: "30px 0",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>No campaigns
            yet. Create one to double your customers' points during a promotion.
          </div>
        ) : (
          <div>
            {campaigns.map((c) => {
              const active = isActive(c),
                upcoming = c.is_active && c.start_date > today,
                past = c.end_date < today;
              let statusColour = C.textLight,
                statusLabel = "Inactive";
              if (active) {
                statusColour = C.green;
                statusLabel = "🟢 LIVE NOW";
              } else if (upcoming) {
                statusColour = C.blue;
                statusLabel = `🔵 Starts ${c.start_date}`;
              } else if (past) {
                statusLabel = `⚫ Ended ${c.end_date}`;
              }
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    padding: "14px 18px",
                    marginBottom: 10,
                    borderRadius: 10,
                    background: active ? C.greenPale : C.bg,
                    border: `1.5px solid ${active ? C.greenLight + "60" : C.border}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontSize: 16,
                          fontWeight: 600,
                          color: C.green,
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 11,
                          fontWeight: 700,
                          color: statusColour,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_BODY,
                        fontSize: 12,
                        color: C.textLight,
                      }}
                    >
                      {c.start_date} → {c.end_date} &nbsp;·&nbsp;{" "}
                      <span style={{ fontWeight: 700, color: C.gold }}>
                        {c.multiplier}× points
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleActive(c)}
                      style={{
                        padding: "6px 14px",
                        background: c.is_active ? C.amberPale : C.greenPale,
                        border: `1px solid ${c.is_active ? C.amber + "50" : C.greenLight + "50"}`,
                        borderRadius: 6,
                        fontFamily: FONT_BODY,
                        fontSize: 11,
                        fontWeight: 600,
                        color: c.is_active ? C.amber : C.green,
                        cursor: "pointer",
                      }}
                    >
                      {c.is_active ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      style={{
                        padding: "6px 14px",
                        background: C.bluePale,
                        border: `1px solid ${C.blue}30`,
                        borderRadius: 6,
                        fontFamily: FONT_BODY,
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.blue,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{
                        padding: "6px 14px",
                        background: C.redPale,
                        border: `1px solid ${C.red}30`,
                        borderRadius: 6,
                        fontFamily: FONT_BODY,
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.red,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <InfoBox colour={C.gold} bgColour={C.goldPale}>
          <strong>How campaigns work:</strong> When a customer scans a QR code
          and a campaign is active today, the campaign multiplier is applied{" "}
          <em>on top of</em> their tier multiplier. A Gold tier customer (2×)
          during a 2× campaign earns <strong>2 × 2 = 4×</strong> base points.
        </InfoBox>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT v2.1 — WP-Z: added recalculate_all_tiers() RPC
// ═══════════════════════════════════════════════════════════════════════════
export default function HQLoyalty() {
  const ctx = usePageContext("loyalty", null);
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingSchema, setApplyingSchema] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [liveStats, setLiveStats] = useState(null);
  const [qrStats, setQrStats] = useState(null);
  const [referralLB, setReferralLB] = useState([]);

  const SUB_TABS = [
    { label: "🎛️ Schema", key: "schema" },
    { label: "📊 Earning Rules", key: "earning" },
    { label: "🏆 Tiers", key: "tiers" },
    { label: "💰 Economics", key: "economics" },
    { label: "🎁 Referrals", key: "referrals" },
    { label: "⚠ QR Security", key: "qrsecurity" },
    { label: "📈 Simulator", key: "simulator" },
    { label: "📅 Campaigns", key: "campaigns" },
  ];

  const isConfigTab = activeTab < 7;
  const isDirty =
    draft && config ? JSON.stringify(draft) !== JSON.stringify(config) : false;

  function showToast(msg, type = "success") {
    setToast({ msg, type });
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const { data: cfgData, error: cfgErr } = await supabase
        .from("loyalty_config")
        .select("*")
        .single();
      if (cfgErr && cfgErr.code !== "PGRST116") throw cfgErr;
      const cfg = { ...DEFAULT_CONFIG, ...(cfgData || {}) };
      setConfig(cfg);
      setDraft({ ...cfg });

      const { data: txData } = await supabase
        .from("loyalty_transactions")
        .select("points, transaction_type, created_at");
      if (txData) {
        const now = new Date(),
          cutoff30 = new Date(now - 30 * 24 * 3600 * 1000);
        const recent = txData.filter((t) => new Date(t.created_at) >= cutoff30);
        const isEarned = (t) =>
          t.transaction_type &&
          !t.transaction_type.toLowerCase().includes("redeem");
        const isRedeemed = (t) =>
          t.transaction_type &&
          t.transaction_type.toLowerCase().includes("redeem");
        setLiveStats({
          totalPtsIssued: txData
            .filter(isEarned)
            .reduce((s, t) => s + (t.points || 0), 0),
          totalPtsRedeemed: txData
            .filter(isRedeemed)
            .reduce((s, t) => s + Math.abs(t.points || 0), 0),
          totalPtsIssued30d: recent
            .filter(isEarned)
            .reduce((s, t) => s + (t.points || 0), 0),
          totalPtsRedeemed30d: recent
            .filter(isRedeemed)
            .reduce((s, t) => s + Math.abs(t.points || 0), 0),
          totalRevenue: 0,
        });
      }

      const { data: qrData } = await supabase
        .from("qr_codes")
        .select("is_active, claimed, expires_at");
      if (qrData) {
        const now = new Date();
        setQrStats({
          total: qrData.filter((q) => q.is_active).length,
          claimed: qrData.filter((q) => q.claimed).length,
          expired: qrData.filter(
            (q) => q.expires_at && new Date(q.expires_at) < now,
          ).length,
          invalidToday: 0,
        });
      }

      const { data: refData } = await supabase
        .from("referral_codes")
        .select("code, uses_count, owner_id")
        .eq("is_active", true)
        .order("uses_count", { ascending: false })
        .limit(10);
      if (refData && refData.length > 0) {
        const ownerIds = refData.map((r) => r.owner_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        const profileMap = {};
        (profiles || []).forEach((p) => {
          profileMap[p.id] = p.full_name;
        });
        setReferralLB(
          refData.map((r) => ({ ...r, name: profileMap[r.owner_id] || null })),
        );
      }
    } catch (err) {
      console.error("HQLoyalty load error:", err);
      setDraft({ ...DEFAULT_CONFIG });
      showToast("Could not load config — using defaults", "error");
    } finally {
      setLoading(false);
    }
  }

  // ─── WP-Z: helper — recalculates ALL customer tiers after any config change ──
  async function recalculateAllTiers() {
    try {
      const { error } = await supabase.rpc("recalculate_all_tiers");
      if (error) console.error("Tier recalculation failed:", error.message);
    } catch (err) {
      console.error("Tier recalculation exception:", err);
    }
  }

  // ── Apply full schema preset ──────────────────────────────────────────────
  async function handleApplySchema(schema) {
    setApplyingSchema(true);
    try {
      const schemaValues = { ...schema.values, active_schema: schema.id };
      const { error } = await supabase
        .from("loyalty_config")
        .update(schemaValues)
        .eq("id", config.id);
      if (error) throw error;
      // WP-Z: immediately recalculate all customer tiers to match new thresholds
      await recalculateAllTiers();
      const newConfig = { ...config, ...schemaValues };
      setConfig(newConfig);
      setDraft({ ...newConfig });
      if (ctx?.refresh) ctx.refresh();
      showToast(
        `✓ ${schema.label} schema applied — all customer tiers updated live`,
      );
    } catch (err) {
      console.error("HQLoyalty applySchema error:", err);
      showToast("Apply failed: " + (err.message || "unknown error"), "error");
    } finally {
      setApplyingSchema(false);
    }
  }

  // ── Save manual overrides ─────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    try {
      const { id, updated_by, ...fields } = draft;
      const activeSchema = SCHEMAS.find((s) => s.id === draft.active_schema);
      let schemaToSave = draft.active_schema || "standard";
      if (activeSchema) {
        const hasDeviation = Object.keys(activeSchema.values).some(
          (k) => String(draft[k]) !== String(activeSchema.values[k]),
        );
        if (hasDeviation) schemaToSave = "custom";
      }
      const { error } = await supabase
        .from("loyalty_config")
        .update({ ...fields, active_schema: schemaToSave })
        .eq("id", config.id);
      if (error) throw error;
      // WP-Z: recalculate all tiers whenever thresholds might have changed
      await recalculateAllTiers();
      setConfig({ ...draft, active_schema: schemaToSave });
      setDraft((d) => ({ ...d, active_schema: schemaToSave }));
      if (ctx?.refresh) ctx.refresh();
      showToast("Loyalty config saved — all customer tiers updated live");
    } catch (err) {
      console.error("HQLoyalty save error:", err);
      showToast("Save failed: " + (err.message || "unknown error"), "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
        }}
      >
        <div
          style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textLight }}
        >
          Loading loyalty configuration...
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: C.bg, minHeight: "100%" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@400;500;600;700&display=swap');`}</style>
      <WorkflowGuide
        context={ctx}
        tabId="loyalty"
        onAction={(action) => action.tab && setActiveTab(action.tab)}
        defaultOpen={true}
      />
      <div
        style={{
          padding: "24px 28px 0",
          borderBottom: `1px solid ${C.border}`,
          background: C.white,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <h1
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 28,
                  fontWeight: 700,
                  color: C.green,
                  margin: 0,
                  letterSpacing: "0.01em",
                }}
              >
                💎 Loyalty Economics Engine
              </h1>
              {config?.active_schema && (
                <span
                  style={{
                    background:
                      config.active_schema === "conservative"
                        ? C.bluePale
                        : config.active_schema === "aggressive"
                          ? C.purplePale
                          : config.active_schema === "custom"
                            ? C.amberPale
                            : C.greenPale,
                    color:
                      config.active_schema === "conservative"
                        ? C.blue
                        : config.active_schema === "aggressive"
                          ? C.purple
                          : config.active_schema === "custom"
                            ? C.amber
                            : C.green,
                    border: `1px solid ${config.active_schema === "conservative" ? C.blue : config.active_schema === "aggressive" ? C.purple : config.active_schema === "custom" ? C.amber : C.green}40`,
                    borderRadius: 20,
                    padding: "2px 12px",
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {config.active_schema === "conservative"
                    ? "🛡️"
                    : config.active_schema === "aggressive"
                      ? "🚀"
                      : config.active_schema === "custom"
                        ? "✏️"
                        : "⚖️"}{" "}
                  {config.active_schema}
                </span>
              )}
              {isDirty && (
                <span
                  style={{
                    background: C.amberPale,
                    color: C.amber,
                    border: `1px solid ${C.amber}40`,
                    borderRadius: 20,
                    padding: "2px 12px",
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  UNSAVED CHANGES
                </span>
              )}
            </div>
            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: C.textLight,
                margin: "4px 0 0",
              }}
            >
              All changes update live across the entire platform — ScanResult,
              CheckoutPage, Loyalty, Redeem.
            </p>
          </div>
          {isConfigTab && activeTab > 0 && (
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              style={{
                padding: "10px 24px",
                background: isDirty ? C.green : C.border,
                color: isDirty ? C.white : C.textLight,
                border: "none",
                borderRadius: 8,
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: 600,
                cursor: isDirty ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {saving ? "Saving..." : "💾 Save All Changes"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {SUB_TABS.map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(i)}
              style={{
                padding: "10px 18px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === i
                    ? `3px solid ${i === 0 ? C.greenMid : i === 7 ? C.gold : C.green}`
                    : "3px solid transparent",
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: activeTab === i ? 600 : 400,
                color:
                  activeTab === i
                    ? i === 0
                      ? C.greenMid
                      : i === 7
                        ? C.gold
                        : C.green
                    : C.textMid,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "24px 28px", maxWidth: 960 }}>
        {activeTab === 0 && (
          <TabSchema
            config={config}
            onApplySchema={handleApplySchema}
            applyingSchema={applyingSchema}
          />
        )}
        {activeTab === 1 && <TabEarning draft={draft} setDraft={setDraft} />}
        {activeTab === 2 && <TabTiers draft={draft} setDraft={setDraft} />}
        {activeTab === 3 && (
          <TabEconomics
            draft={draft}
            setDraft={setDraft}
            liveStats={liveStats}
          />
        )}
        {activeTab === 4 && (
          <TabReferrals
            draft={draft}
            setDraft={setDraft}
            referralLeaderboard={referralLB}
          />
        )}
        {activeTab === 5 && (
          <TabQRSecurity draft={draft} setDraft={setDraft} qrStats={qrStats} />
        )}
        {activeTab === 6 && <TabSimulator draft={draft} />}
        {activeTab === 7 && <TabCampaigns showToast={showToast} />}
      </div>
      {isDirty && activeTab > 0 && activeTab < 7 && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            background: C.white,
            borderTop: `1px solid ${C.border}`,
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
            zIndex: 100,
          }}
        >
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.amber,
              fontWeight: 600,
            }}
          >
            ⚠ Unsaved changes — not yet live on the platform
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setDraft({ ...config })}
              style={{
                padding: "8px 18px",
                background: "none",
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: C.textMid,
                cursor: "pointer",
              }}
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "8px 22px",
                background: C.green,
                border: "none",
                borderRadius: 7,
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: 600,
                color: C.white,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "💾 Save All Changes"}
            </button>
          </div>
        </div>
      )}
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
