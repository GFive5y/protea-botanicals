// HQLoyalty.js v3.0
// WP-THEME: Unified design system applied
//   - Outfit replaces Cormorant Garamond + Jost
//   - DM Mono for all metric/numeric values
//   - Purple removed — Aggressive schema uses info-blue
//   - Emoji removed from h1 title and sub-tab labels
//   - SectionCard: gradient header removed, clean border-left accent
//   - Schema cards: no coloured top borders, semantic badge colours
//   - Google Fonts <style> tag removed (loaded globally via index.html)
// v2.4: InfoTooltip — loyalty-threshold, loyalty-multiplier, loyalty-redemption-value
// v2.3: WP-GUIDE-B tooltips | v2.2: WP-GUIDE-A context | v2.1: WP-Z tier recalc
// v2.0: Schema Selector + Live Config

import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../../services/supabaseClient";
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import InfoTooltip from "../InfoTooltip";
import { ChartCard, ChartTooltip } from "../viz";

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink300: "#B0B0B0",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  ink400: "#888888",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

// Legacy aliases used internally
const C = {
  bg: T.ink050,
  card: "#ffffff",
  border: T.ink150,
  borderDark: "#C8C0B0",
  green: T.accent,
  greenMid: T.accentMid,
  greenLight: "#52b788",
  greenPale: T.accentLit,
  blue: T.info,
  bluePale: T.infoBg,
  amber: T.warning,
  amberPale: T.warningBg,
  red: T.danger,
  redPale: T.dangerBg,
  text: T.ink900,
  textMid: T.ink700,
  textLight: T.ink500,
  white: "#ffffff",
  gold: "#b5935a",
  goldPale: "#FFF8E7",
};
const FONT_DISPLAY = T.fontUi; // Outfit replaces Cormorant everywhere
const FONT_BODY = T.fontUi;

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
    tagline: "Low cost · entry level",
    description:
      "Minimal programme cost. Ideal for launch — test engagement without committing to high reward liabilities. Best when you want to measure customer engagement before scaling up rewards.",
    costBadge: "~R0.065 per point issued",
    costColor: T.info,
    costBg: T.infoBg,
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
    tagline: "Balanced · international best practice",
    description:
      "Follows global loyalty programme benchmarks. Good balance between customer motivation and programme cost. Tier multipliers create genuine incentive to remain loyal.",
    costBadge: "~R0.11 per point issued",
    costColor: T.accent,
    costBg: T.accentLit,
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
    tagline: "High reward · acquisition focused",
    description:
      "Maximum engagement and acquisition power. Higher programme cost but drives strong word-of-mouth, repeat purchase, and brand advocacy. Best for growth phases or competitive markets.",
    costBadge: "~R0.16 per point issued",
    costColor: T.ink700,
    costBg: T.ink075, // ★ WP-THEME: purple retired → neutral dark
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
  Bronze: { bg: "#FFF3E0", text: "#92400E", border: "#FDE68A" },
  Silver: { bg: "#F5F5F5", text: "#424242", border: "#BDBDBD" },
  Gold: { bg: "#FFFDE7", text: "#92400E", border: "#FFD54F" },
  Platinum: { bg: T.infoBg, text: T.info, border: T.infoBd }, // info-blue replaces purple
};

// ─── Reusable sub-components ─────────────────────────────────────────────────

function SectionCard({ title, subtitle, children, accent }) {
  const ac = accent || T.accent;
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${T.ink150}`,
        borderRadius: 8,
        marginBottom: 20,
        overflow: "hidden",
        boxShadow: T.shadow,
      }}
    >
      <div
        style={{
          borderBottom: `1px solid ${T.ink150}`,
          padding: "14px 20px",
          borderLeft: `3px solid ${ac}`,
        }}
      >
        <div
          style={{
            fontFamily: T.fontUi,
            fontSize: 14,
            fontWeight: 600,
            color: T.ink900,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: T.fontUi,
              fontSize: 12,
              color: T.ink500,
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
            fontFamily: T.fontUi,
            fontSize: 13,
            fontWeight: 600,
            color: T.ink900,
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
            fontFamily: T.fontUi,
            fontSize: 12,
            color: T.ink500,
            marginTop: 6,
            lineHeight: 1.55,
            borderLeft: `2px solid ${T.ink150}`,
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
          border: `1.5px solid ${T.ink150}`,
          borderRadius: 4,
          fontFamily: T.fontData,
          fontSize: 14,
          fontWeight: 600,
          color: T.accent,
          background: "#fff",
          outline: "none",
          textAlign: "center",
        }}
      />
      {suffix && (
        <span style={{ fontFamily: T.fontUi, fontSize: 13, color: T.ink700 }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function InfoBox({ children, colour, bgColour }) {
  const co = colour || T.info,
    bg = bgColour || T.infoBg;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${co}30`,
        borderRadius: 6,
        padding: "12px 16px",
        fontFamily: T.fontUi,
        fontSize: 12.5,
        color: T.ink700,
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
        background: T.accentLit,
        border: `1px solid ${T.accentBd}`,
        borderRadius: 6,
        padding: "14px 16px",
        marginTop: 14,
      }}
    >
      <div
        style={{
          fontFamily: T.fontUi,
          fontSize: 10,
          fontWeight: 700,
          color: T.accentMid,
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
      <span style={{ fontFamily: T.fontUi, fontSize: 12.5, color: T.ink500 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: T.fontData,
          fontSize: 13,
          fontWeight: highlight ? 700 : 500,
          color: highlight ? T.accent : T.ink700,
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
        background: type === "error" ? T.danger : T.accent,
        color: "#fff",
        padding: "14px 22px",
        borderRadius: 8,
        fontFamily: T.fontUi,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.20)",
      }}
    >
      {type === "error" ? "✗ " : "✓ "}
      {msg}
    </div>
  );
}

// ─── Tab: Schema ─────────────────────────────────────────────────────────────
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
      title: "How live updates work",
      body: "Every page — ScanResult, CheckoutPage, Loyalty and Redeem — reads from loyalty_config on each load. When you apply a schema, all values are written in a single operation. All existing customer tiers are immediately recalculated.",
    },
    {
      title: "Understanding cost per point",
      body: "Cost per point = redemption_value_zar × (1 − breakage_rate). Conservative: R0.10 × 0.65 = R0.065. Standard: R0.15 × 0.75 = R0.11. Aggressive: R0.20 × 0.80 = R0.16.",
    },
    {
      title: "Online bonus vs retail",
      body: "The online_bonus_pct gives direct website purchasers more points than retail customers who scan a QR. Standard gives 100% extra online — a direct customer earns double what a retail customer earns on the same spend.",
    },
    {
      title: "Tier multipliers",
      body: "Multipliers apply to ALL earned points — scans, purchases, referrals and streak bonuses. A Platinum customer at 3× earns triple points on every interaction. Once a customer reaches Platinum tier, downgrading to a competitor means losing their multiplier advantage.",
    },
    {
      title: "Breakage rate",
      body: "Breakage is the percentage of issued points never redeemed. Industry average is 20–35%. A higher breakage rate lowers your actual programme cost. Conservative assumes 35% breakage; Aggressive assumes 20%.",
    },
    {
      title: "Schema + manual override",
      body: "Applying a schema sets all values at once — useful for a clean baseline. After applying, fine-tune individual values using the tabs above. Manual overrides save separately via Save All Changes.",
    },
  ];

  return (
    <div>
      {/* Intro banner */}
      <div
        style={{
          background: T.accentLit,
          border: `1px solid ${T.accentBd}`,
          borderRadius: 8,
          padding: "18px 22px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: T.fontUi,
            fontSize: 16,
            fontWeight: 600,
            color: T.accent,
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
            fontFamily: T.fontUi,
            fontSize: 13,
            color: T.ink700,
            lineHeight: 1.7,
            maxWidth: 700,
          }}
        >
          Choose a pre-calibrated rewards level. Clicking <strong>Apply</strong>{" "}
          writes all values to the database — all existing customer tiers are
          immediately recalculated.
        </div>
        <div
          style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          {[
            "QR scans",
            "Online purchases",
            "Referral rewards",
            "Streak bonuses",
            "Tier multipliers",
            "Redemption values",
            "Expiry rules",
            "All tiers recalculated",
          ].map((tag) => (
            <span
              key={tag}
              style={{
                background: "white",
                color: T.accentMid,
                border: `1px solid ${T.accentBd}`,
                borderRadius: 3,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Schema cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))",
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
                background: "#fff",
                border: `1.5px solid ${active ? schema.costColor : T.ink150}`,
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: active
                  ? `0 4px 16px ${schema.costColor}18`
                  : T.shadow,
              }}
            >
              {/* Card header */}
              <div
                style={{
                  background: active ? schema.costColor : T.ink075,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: T.fontUi,
                      fontSize: 16,
                      fontWeight: 700,
                      color: active ? "#fff" : T.ink900,
                      marginBottom: 2,
                    }}
                  >
                    {schema.label}
                  </div>
                  <div
                    style={{
                      fontFamily: T.fontUi,
                      fontSize: 11,
                      color: active ? "rgba(255,255,255,0.8)" : T.ink500,
                    }}
                  >
                    {schema.tagline}
                  </div>
                </div>
                {active && (
                  <span
                    style={{
                      background: "rgba(255,255,255,0.2)",
                      color: "#fff",
                      borderRadius: 3,
                      padding: "2px 10px",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>
              {/* Card body */}
              <div style={{ padding: "16px 20px" }}>
                {/* Cost badge */}
                <span
                  style={{
                    display: "inline-block",
                    background: schema.costBg,
                    color: schema.costColor,
                    border: `1px solid ${schema.costColor}30`,
                    borderRadius: 3,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 12,
                    letterSpacing: "0.04em",
                  }}
                >
                  {schema.costBadge}
                </span>
                <div
                  style={{
                    fontFamily: T.fontUi,
                    fontSize: 12.5,
                    color: T.ink700,
                    lineHeight: 1.65,
                    marginBottom: 14,
                  }}
                >
                  {schema.description}
                </div>
                {/* Preview rows */}
                <div
                  style={{
                    background: T.ink075,
                    borderRadius: 6,
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
                            ? `1px solid ${T.ink150}`
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: T.fontUi,
                          fontSize: 12,
                          color: T.ink500,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontFamily: T.fontData,
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
                {/* Apply button */}
                {confirmSchema === schema.id ? (
                  <div>
                    <div
                      style={{
                        fontFamily: T.fontUi,
                        fontSize: 12,
                        color: T.ink700,
                        marginBottom: 10,
                        background: T.warningBg,
                        padding: "8px 12px",
                        borderRadius: 4,
                        border: `1px solid ${T.warningBd}`,
                      }}
                    >
                      This will overwrite all current loyalty settings and
                      recalculate all customer tiers. Confirm?
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
                          color: "#fff",
                          border: "none",
                          borderRadius: 5,
                          fontFamily: T.fontUi,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {applyingSchema ? "Applying…" : "Confirm Apply"}
                      </button>
                      <button
                        onClick={() => setConfirmSchema(null)}
                        style={{
                          flex: 1,
                          padding: "9px",
                          background: "none",
                          border: `1px solid ${T.ink150}`,
                          borderRadius: 5,
                          fontFamily: T.fontUi,
                          fontSize: 12,
                          color: T.ink500,
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
                        ? `${schema.costColor}12`
                        : schema.costColor,
                      color: active ? schema.costColor : "#fff",
                      border: `1.5px solid ${schema.costColor}`,
                      borderRadius: 6,
                      fontFamily: T.fontUi,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: active ? "default" : "pointer",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {active
                      ? "Currently Active"
                      : `Apply ${schema.label} Schema`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full comparison table */}
      <SectionCard
        title="Full Schema Comparison"
        subtitle="All values across all three schemas"
        accent={T.info}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: T.fontUi,
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
                    color: T.ink400,
                    textTransform: "uppercase",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    borderBottom: `2px solid ${T.ink150}`,
                    background: T.ink075,
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
                      background: `${s.costColor}06`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.label}
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
                  style={{ background: i % 2 === 0 ? T.ink075 : "#fff" }}
                >
                  <td
                    style={{
                      padding: "9px 14px",
                      color: T.ink700,
                      fontWeight: 500,
                      borderBottom: `1px solid ${T.ink150}`,
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
                          fontFamily: T.fontData,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? s.costColor : T.ink700,
                          borderBottom: `1px solid ${T.ink150}`,
                          background: isActive
                            ? `${s.costColor}06`
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

      {/* Understanding each setting */}
      <SectionCard
        title="Understanding Each Setting"
        subtitle="What these values control across the platform"
        accent={T.warning}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
            gap: 14,
          }}
        >
          {ONBOARDING.map((item, i) => (
            <div
              key={i}
              style={{
                background: T.ink075,
                border: `1px solid ${T.ink150}`,
                borderRadius: 6,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontFamily: T.fontUi,
                  fontSize: 13,
                  fontWeight: 700,
                  color: T.ink900,
                  marginBottom: 6,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontFamily: T.fontUi,
                  fontSize: 12,
                  color: T.ink700,
                  lineHeight: 1.65,
                }}
              >
                {item.body}
              </div>
            </div>
          ))}
        </div>
        <InfoBox colour={T.warning} bgColour={T.warningBg}>
          <strong>Pro tip:</strong> Apply a schema first to get a clean
          baseline, then use the Earning Rules, Tiers, and Economics tabs to
          tweak individual values.
        </InfoBox>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Earning Rules ───────────────────────────────────────────────────────
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
          explanation={`One scan earns ${cfg.pts_qr_scan} pts = R${(cfg.pts_qr_scan * costPerPt).toFixed(2)} actual cost (after ${Math.round(cfg.breakage_rate * 100)}% breakage).`}
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
        accent={T.accentMid}
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
            style={{ borderTop: `1px solid ${T.ink150}`, margin: "8px 0" }}
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
        accent={T.warning}
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
        accent={T.info}
      >
        <FieldRow
          label="Streak bonus points"
          explanation={`Customer earns this bonus after scanning ${cfg.streak_interval} times in a row.`}
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
          explanation="Points auto-awarded on customer's birthday."
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
        accent={T.info}
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

// ─── Tab: Tiers ───────────────────────────────────────────────────────────────
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
  function weeksToTier(p) {
    return Math.ceil(p / cfg.pts_qr_scan);
  }
  function monthsToTierBuying(p) {
    const ppm =
      (400 / 100) * cfg.pts_per_r100_online * (1 + cfg.online_bonus_pct / 100);
    return Math.ceil(p / ppm);
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
            gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
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
                borderRadius: 8,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontFamily: T.fontUi,
                  fontSize: 16,
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
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontFamily: T.fontUi,
                      fontSize: 10,
                      color: T.ink500,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Reaches at{" "}
                    <InfoTooltip
                      id="loyalty-threshold"
                      title="What is a tier threshold?"
                      body="Total points a customer needs to reach this tier. Once they cross this threshold their tier upgrades instantly. Thresholds apply to all-time accumulated points."
                    />
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
                    fontFamily: T.fontUi,
                    fontSize: 12,
                    color: T.ink500,
                    marginBottom: 12,
                  }}
                >
                  Starting tier (0 pts)
                </div>
              )}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontFamily: T.fontUi,
                    fontSize: 10,
                    color: T.ink500,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Earn multiplier <InfoTooltip id="loyalty-multiplier" />
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
        <PreviewBox title="Tier Journey">
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
                borderBottom: i < 2 ? `1px solid ${T.ink150}` : "none",
              }}
            >
              <div
                style={{
                  fontFamily: T.fontUi,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.ink700,
                  marginBottom: 3,
                }}
              >
                {step.label} — {step.pts} pts
              </div>
              <div
                style={{ fontFamily: T.fontUi, fontSize: 12, color: T.ink500 }}
              >
                Scanning once/week: ~{weeksToTier(step.pts)} weeks · Buying
                R400/month online: ~{monthsToTierBuying(step.pts)} months
              </div>
            </div>
          ))}
        </PreviewBox>
      </SectionCard>
      <SectionCard title="Multiplier Impact" accent={T.info}>
        <InfoBox colour={T.info} bgColour={T.infoBg}>
          <strong>Platinum vs Bronze on R400/month online:</strong>
          <br />
          Bronze (1×): {Math.round(bronzeBuying)} pts/month = R
          {(Math.round(bronzeBuying) * cfg.redemption_value_zar).toFixed(2)}
          /month value
          <br />
          Platinum ({cfg.mult_platinum}×): {Math.round(platBuying)} pts/month =
          R{(Math.round(platBuying) * cfg.redemption_value_zar).toFixed(2)}
          /month value
          <br />
          Difference: +{Math.round(platBuying - bronzeBuying)} pts/month
        </InfoBox>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Economics ───────────────────────────────────────────────────────────
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
        <FieldRow
          label={
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              1 point = R___ value to customer
              <InfoTooltip
                id="loyalty-redemption-value"
                title="What does point value mean?"
                body="This is how much each point is worth in Rand when a customer redeems. At R0.15 per point, 1 000 points = R150 off their order."
              />
            </span>
          }
        >
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
      <SectionCard title="Financial Model" accent={T.info}>
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
            style={{ borderTop: `1px solid ${T.ink150}`, margin: "8px 0" }}
          />
          <PreviewLine
            label="Actual cost per point issued"
            value={`R${costPerPt.toFixed(3)}`}
            highlight
          />
        </PreviewBox>
      </SectionCard>
      {/* ── CHARTS: Points trend + Tier distribution ── */}
      {liveStats &&
        (() => {
          // We need per-day data — fetch it from transactions passed in
          // Use liveStats totals to build a simple donut + summary area
          const totalIssued = liveStats.totalPtsIssued || 0;
          const totalRedeemed = liveStats.totalPtsRedeemed || 0;
          const outstanding = Math.max(0, totalIssued - totalRedeemed);
          const donutData = [
            { name: "Redeemed", value: totalRedeemed },
            { name: "Outstanding", value: outstanding },
          ].filter((d) => d.value > 0);
          const DONUT_COLOURS = [T.accentMid, T.info];

          // Period bars using 30d vs all-time
          const barData = [
            {
              period: "All Time",
              issued: totalIssued,
              redeemed: totalRedeemed,
            },
            {
              period: "30 Days",
              issued: liveStats.totalPtsIssued30d || 0,
              redeemed: liveStats.totalPtsRedeemed30d || 0,
            },
          ];

          if (totalIssued === 0) return null;
          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <ChartCard title="Points Issued vs Redeemed" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={barData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="loy-iss-grad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={T.accentMid}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor={T.accentMid}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="loy-red-grad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={T.info}
                          stopOpacity={0.15}
                        />
                        <stop offset="95%" stopColor={T.info} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.ink150}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="period"
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink400,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v) => `${v.toLocaleString()} pts`}
                        />
                      }
                    />
                    <Legend
                      iconSize={8}
                      iconType="square"
                      formatter={(v) => (
                        <span
                          style={{
                            fontSize: 11,
                            color: T.ink500,
                            fontFamily: T.font,
                          }}
                        >
                          {v}
                        </span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="issued"
                      name="Issued"
                      stroke={T.accentMid}
                      strokeWidth={2}
                      fill="url(#loy-iss-grad)"
                      dot={{ r: 4, fill: T.accentMid }}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="redeemed"
                      name="Redeemed"
                      stroke={T.info}
                      strokeWidth={2}
                      fill="url(#loy-red-grad)"
                      dot={{ r: 4, fill: T.info }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Points Balance" height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      dataKey="value"
                      paddingAngle={4}
                      isAnimationActive={false}
                    >
                      {donutData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={DONUT_COLOURS[i % DONUT_COLOURS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v) => `${v.toLocaleString()} pts`}
                        />
                      }
                    />
                    <Legend
                      iconSize={8}
                      iconType="square"
                      formatter={(v) => (
                        <span
                          style={{
                            fontSize: 11,
                            color: T.ink500,
                            fontFamily: T.font,
                          }}
                        >
                          {v}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          );
        })()}

      <SectionCard title="Programme Cost Dashboard" accent={T.accentMid}>
        {liveStats ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))",
              gap: 12,
            }}
          >
            {[
              {
                label: "Points Issued (30d)",
                value: liveStats.totalPtsIssued30d?.toLocaleString() || "0",
                semantic: "success",
              },
              {
                label: "Points Redeemed (30d)",
                value: liveStats.totalPtsRedeemed30d?.toLocaleString() || "0",
                semantic: "info",
              },
              {
                label: "Redemption Rate",
                value: `${actualRedemptionRate}%`,
                semantic: "warning",
              },
              {
                label: "Outstanding Liability",
                value: `R${outstandingLiability.toFixed(0)}`,
                semantic: "danger",
              },
              {
                label: "Programme Cost",
                value: `R${programmeCost.toFixed(0)}`,
                semantic: null,
              },
              {
                label: "Cost as % Revenue",
                value: `${costAsPctRev}%`,
                semantic: "success",
              },
            ].map((s, i) => {
              const semColors = {
                success: { c: T.success, bg: T.successBg },
                warning: { c: T.warning, bg: T.warningBg },
                danger: { c: T.danger, bg: T.dangerBg },
                info: { c: T.info, bg: T.infoBg },
              };
              const sem = s.semantic
                ? semColors[s.semantic]
                : { c: T.ink700, bg: "#fff" };
              return (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 8,
                    padding: "12px 14px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.fontData,
                      fontSize: 20,
                      fontWeight: 700,
                      color: sem.c,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontFamily: T.fontUi,
                      fontSize: 11,
                      color: T.ink500,
                      marginTop: 2,
                      lineHeight: 1.3,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              fontFamily: T.fontUi,
              fontSize: 13,
              color: T.ink500,
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

// ─── Tab: Referrals ───────────────────────────────────────────────────────────
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
      <SectionCard title="Top Referrers" accent={T.info}>
        {referralLeaderboard && referralLeaderboard.length > 0 ? (
          referralLeaderboard.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: i === 0 ? T.infoBg : T.ink075,
                borderRadius: 6,
                marginBottom: 6,
                border: `1px solid ${i === 0 ? T.infoBd : T.ink150}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: i === 0 ? T.info : T.ink300,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: T.fontUi,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: T.fontUi,
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.ink900,
                    }}
                  >
                    {entry.name || entry.code}
                  </div>
                  <div
                    style={{
                      fontFamily: T.fontData,
                      fontSize: 11,
                      color: T.ink500,
                    }}
                  >
                    Code: {entry.code}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: T.fontData,
                    fontSize: 18,
                    fontWeight: 700,
                    color: T.info,
                  }}
                >
                  {entry.uses_count} referrals
                </div>
                <div
                  style={{
                    fontFamily: T.fontUi,
                    fontSize: 11,
                    color: T.ink500,
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
              fontFamily: T.fontUi,
              fontSize: 13,
              color: T.ink500,
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

// ─── Tab: QR Security ─────────────────────────────────────────────────────────
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
        <SectionCard title="Live QR Stats" accent={T.info}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
              gap: 12,
            }}
          >
            {[
              {
                label: "Active QR Codes",
                value: qrStats.total?.toLocaleString() || "0",
                semantic: "success",
              },
              {
                label: "Claimed",
                value: qrStats.claimed?.toLocaleString() || "0",
                semantic: "info",
              },
              {
                label: "Claim Rate",
                value: `${qrStats.total > 0 ? ((qrStats.claimed / qrStats.total) * 100).toFixed(1) : 0}%`,
                semantic: "warning",
              },
              {
                label: "Expired",
                value: qrStats.expired?.toLocaleString() || "0",
                semantic: null,
              },
              {
                label: "Invalid Attempts",
                value: qrStats.invalidToday?.toLocaleString() || "0",
                semantic: "danger",
              },
            ].map((s, i) => {
              const semColors = {
                success: { c: T.success },
                warning: { c: T.warning },
                danger: { c: T.danger },
                info: { c: T.info },
              };
              const c = s.semantic ? semColors[s.semantic].c : T.ink500;
              return (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.fontData,
                      fontSize: 22,
                      fontWeight: 700,
                      color: c,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontFamily: T.fontUi,
                      fontSize: 11,
                      color: T.ink500,
                      marginTop: 2,
                      lineHeight: 1.3,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Tab: Simulator ───────────────────────────────────────────────────────────
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
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
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
        {[
          {
            label: `Current: ${onlinePct}% online`,
            val: onlinePct,
            set: setOnlinePct,
            color: T.warning,
          },
          {
            label: `Target: ${targetPct}% online`,
            val: targetPct,
            set: setTargetPct,
            color: T.accentMid,
          },
        ].map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: T.fontUi,
                fontSize: 13,
                color: T.ink700,
                marginBottom: 6,
              }}
            >
              <strong>{s.label}</strong>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={s.val}
              onChange={(e) => s.set(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: s.color, cursor: "pointer" }}
            />
          </div>
        ))}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            {
              title: `Current — ${onlinePct}% Online`,
              data: current,
              color: T.warning,
              showGain: false,
            },
            {
              title: `Target — ${targetPct}% Online`,
              data: target,
              color: T.accentMid,
              showGain: true,
            },
          ].map((s, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                minWidth: 260,
                background: "#fff",
                border: `1.5px solid ${s.color}40`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div style={{ background: s.color, padding: "10px 16px" }}>
                <div
                  style={{
                    fontFamily: T.fontUi,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#fff",
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
                      borderBottom: i < 3 ? `1px solid ${T.ink150}` : "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: T.fontUi,
                        fontSize: 12,
                        color: T.ink500,
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontFamily: T.fontData,
                        fontSize: 13,
                        fontWeight: row.bold ? 700 : 500,
                        color: T.ink900,
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
                      borderRadius: 6,
                      background: gain > 0 ? T.successBg : T.dangerBg,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: T.fontUi,
                        fontSize: 13,
                        fontWeight: 700,
                        color: gain > 0 ? T.success : T.danger,
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

// ─── Tab: Campaigns ───────────────────────────────────────────────────────────
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
    border: `1.5px solid ${T.ink150}`,
    borderRadius: 5,
    fontFamily: T.fontUi,
    fontSize: 14,
    color: T.ink900,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div>
      <SectionCard
        title="Double Points Campaigns"
        subtitle="Create time-limited multiplier events — active campaigns apply automatically at scan time"
        accent={T.warning}
      >
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={openNew}
            style={{
              padding: "9px 20px",
              background: T.accent,
              border: "none",
              borderRadius: 6,
              fontFamily: T.fontUi,
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            + New Campaign
          </button>
        </div>
        {showForm && (
          <div
            style={{
              background: T.warningBg,
              border: `1.5px solid ${T.warningBd}`,
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontFamily: T.fontUi,
                fontSize: 16,
                fontWeight: 600,
                color: T.ink900,
                marginBottom: 16,
              }}
            >
              {editId ? "Edit Campaign" : "New Campaign"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
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
                      fontFamily: T.fontUi,
                      fontSize: 12,
                      fontWeight: 600,
                      color: T.ink700,
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
                    fontFamily: T.fontUi,
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.ink700,
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
                  fontFamily: T.fontUi,
                  fontSize: 13,
                  color: T.ink700,
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
                  background: T.accent,
                  border: "none",
                  borderRadius: 5,
                  fontFamily: T.fontUi,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
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
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 5,
                  fontFamily: T.fontUi,
                  fontSize: 13,
                  color: T.ink500,
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
              fontFamily: T.fontUi,
              fontSize: 13,
              color: T.ink500,
              textAlign: "center",
              padding: 30,
            }}
          >
            Loading campaigns…
          </div>
        ) : campaigns.length === 0 ? (
          <div
            style={{
              fontFamily: T.fontUi,
              fontSize: 13,
              color: T.ink500,
              textAlign: "center",
              padding: "30px 0",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>—</div>No campaigns
            yet. Create one to double your customers' points during a promotion.
          </div>
        ) : (
          <div>
            {campaigns.map((c) => {
              const active = isActive(c),
                upcoming = c.is_active && c.start_date > today,
                past = c.end_date < today;
              let statusColor = T.ink400,
                statusLabel = "Inactive";
              if (active) {
                statusColor = T.success;
                statusLabel = "Live now";
              } else if (upcoming) {
                statusColor = T.info;
                statusLabel = `Starts ${c.start_date}`;
              } else if (past) {
                statusLabel = `Ended ${c.end_date}`;
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
                    borderRadius: 8,
                    background: active ? T.successBg : T.ink075,
                    border: `1.5px solid ${active ? T.successBd : T.ink150}`,
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
                          fontFamily: T.fontUi,
                          fontSize: 14,
                          fontWeight: 600,
                          color: T.ink900,
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontFamily: T.fontUi,
                          fontSize: 11,
                          fontWeight: 700,
                          color: statusColor,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: T.fontUi,
                        fontSize: 12,
                        color: T.ink500,
                      }}
                    >
                      {c.start_date} → {c.end_date} ·{" "}
                      <span style={{ fontWeight: 700, color: T.warning }}>
                        {c.multiplier}× points
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleActive(c)}
                      style={{
                        padding: "6px 12px",
                        background: c.is_active ? T.warningBg : T.successBg,
                        border: `1px solid ${c.is_active ? T.warningBd : T.successBd}`,
                        borderRadius: 4,
                        fontFamily: T.fontUi,
                        fontSize: 11,
                        fontWeight: 600,
                        color: c.is_active ? T.warning : T.success,
                        cursor: "pointer",
                      }}
                    >
                      {c.is_active ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      style={{
                        padding: "6px 12px",
                        background: T.infoBg,
                        border: `1px solid ${T.infoBd}`,
                        borderRadius: 4,
                        fontFamily: T.fontUi,
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.info,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{
                        padding: "6px 12px",
                        background: T.dangerBg,
                        border: `1px solid ${T.dangerBd}`,
                        borderRadius: 4,
                        fontFamily: T.fontUi,
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.danger,
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
        <InfoBox colour={T.warning} bgColour={T.warningBg}>
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
// MAIN COMPONENT
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

  // ★ WP-THEME: emoji removed from tab labels
  const SUB_TABS = [
    { label: "Schema", key: "schema" },
    { label: "Earning Rules", key: "earning" },
    { label: "Tiers", key: "tiers" },
    { label: "Economics", key: "economics" },
    { label: "Referrals", key: "referrals" },
    { label: "QR Security", key: "qrsecurity" },
    { label: "Simulator", key: "simulator" },
    { label: "Campaigns", key: "campaigns" },
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
        .select("points,transaction_type,created_at");
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
        .select("is_active,claimed,expires_at");
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
        .select("code,uses_count,owner_id")
        .eq("is_active", true)
        .order("uses_count", { ascending: false })
        .limit(10);
      if (refData && refData.length > 0) {
        const ownerIds = refData.map((r) => r.owner_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("id,full_name")
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

  async function recalculateAllTiers() {
    try {
      const { error } = await supabase.rpc("recalculate_all_tiers");
      if (error) console.error("Tier recalculation failed:", error.message);
    } catch (err) {
      console.error("Tier recalculation exception:", err);
    }
  }

  async function handleApplySchema(schema) {
    setApplyingSchema(true);
    try {
      const schemaValues = { ...schema.values, active_schema: schema.id };
      const { error } = await supabase
        .from("loyalty_config")
        .update(schemaValues)
        .eq("id", config.id);
      if (error) throw error;
      await recalculateAllTiers();
      const newConfig = { ...config, ...schemaValues };
      setConfig(newConfig);
      setDraft({ ...newConfig });
      if (ctx?.refresh) ctx.refresh();
      showToast(
        `${schema.label} schema applied — all customer tiers updated live`,
      );
    } catch (err) {
      console.error("HQLoyalty applySchema error:", err);
      showToast("Apply failed: " + (err.message || "unknown error"), "error");
    } finally {
      setApplyingSchema(false);
    }
  }

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
        <div style={{ fontFamily: T.fontUi, fontSize: 14, color: T.ink500 }}>
          Loading loyalty configuration...
        </div>
      </div>
    );
  }

  // Schema badge colour (no purple)
  const schemaBadge = {
    conservative: { bg: T.infoBg, color: T.info, label: "Conservative" },
    standard: { bg: T.accentLit, color: T.accent, label: "Standard" },
    aggressive: { bg: T.ink075, color: T.ink700, label: "Aggressive" },
    custom: { bg: T.warningBg, color: T.warning, label: "Custom" },
  };
  const activeBadge =
    schemaBadge[config?.active_schema] || schemaBadge.standard;

  return (
    <div
      style={{
        fontFamily: T.fontUi,
        background: T.ink050,
        minHeight: "100%",
        scrollbarGutter: "stable",
      }}
    >
      <WorkflowGuide
        context={ctx}
        tabId="loyalty"
        onAction={(action) => action.tab && setActiveTab(action.tab)}
        defaultOpen={true}
      />

      {/* ── Page header ── */}
      <div
        style={{
          padding: "24px 28px 0",
          borderBottom: `1px solid ${T.ink150}`,
          background: "#fff",
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
              {/* ★ WP-THEME: emoji removed from h1 */}
              <h1
                style={{
                  fontFamily: T.fontUi,
                  fontSize: 24,
                  fontWeight: 600,
                  color: T.ink900,
                  margin: 0,
                }}
              >
                Loyalty Economics Engine
              </h1>
              {config?.active_schema && (
                <span
                  style={{
                    background: activeBadge.bg,
                    color: activeBadge.color,
                    border: `1px solid ${activeBadge.color}40`,
                    borderRadius: 3,
                    padding: "2px 10px",
                    fontFamily: T.fontUi,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {activeBadge.label}
                </span>
              )}
              {isDirty && (
                <span
                  style={{
                    background: T.warningBg,
                    color: T.warning,
                    border: `1px solid ${T.warningBd}`,
                    borderRadius: 3,
                    padding: "2px 10px",
                    fontFamily: T.fontUi,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Unsaved changes
                </span>
              )}
            </div>
            <p
              style={{
                fontFamily: T.fontUi,
                fontSize: 13,
                color: T.ink500,
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
                padding: "9px 22px",
                background: isDirty ? T.accent : T.ink150,
                color: isDirty ? "#fff" : T.ink500,
                border: "none",
                borderRadius: 6,
                fontFamily: T.fontUi,
                fontSize: 13,
                fontWeight: 600,
                cursor: isDirty ? "pointer" : "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          )}
        </div>

        {/* Sub-tabs — standard underline style */}
        <div style={{ display: "flex", gap: 0, flexWrap: "nowrap" }}>
          {SUB_TABS.map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(i)}
              style={{
                padding: "10px 16px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === i
                    ? `2px solid ${T.accent}`
                    : "2px solid transparent",
                fontFamily: T.fontUi,
                fontSize: 11,
                fontWeight: activeTab === i ? 700 : 400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: activeTab === i ? T.accent : T.ink500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ display: "flex", gap: 0 }}>
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

      {/* Sticky save bar */}
      {isDirty && activeTab > 0 && activeTab < 7 && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fff",
            borderTop: `1px solid ${T.ink150}`,
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 -4px 16px rgba(0,0,0,0.07)",
            zIndex: 100,
          }}
        >
          <span
            style={{
              fontFamily: T.fontUi,
              fontSize: 13,
              color: T.warning,
              fontWeight: 600,
            }}
          >
            Unsaved changes — not yet live on the platform
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setDraft({ ...config })}
              style={{
                padding: "8px 16px",
                background: "none",
                border: `1px solid ${T.ink150}`,
                borderRadius: 5,
                fontFamily: T.fontUi,
                fontSize: 13,
                color: T.ink500,
                cursor: "pointer",
              }}
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "8px 20px",
                background: T.accent,
                border: "none",
                borderRadius: 5,
                fontFamily: T.fontUi,
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "Save All Changes"}
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
