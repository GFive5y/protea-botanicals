// HQLoyalty.js v4.0
// WP-O v2.0: Next-Gen AI Loyalty Economics Engine
//   CRITICAL FIX: All queries now tenant-scoped via useTenant() (Rule 0G)
//   - loyalty_config fetched with .eq('tenant_id', tenantId) — no more global single()
//   - loyalty_transactions filtered by tenant_id
//   - referral_codes filtered by tenant_id
//   NEW TAB: Category Multipliers (8 product categories, margin-aware earn rates)
//   NEW TAB: AI Engine (automation toggles, loyalty_ai_log feed, weekly brief)
//   TIERS: Harvest Club tier (2,500 pts, 2.5×, multi-category elite)
//   TIERS: At-risk segment — customers near tier drop, 21+ days silent
//   ECONOMICS: Programme Health Score panel (6 factors, 1–10 score)
//   REFERRALS: WhatsApp share button (wa.me deep link, SA market)
//   REFERRALS: tenant_id scoped queries
// v3.0: WP-THEME unified design system — Inter, info-blue, clean borders
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
import { useTenant } from "../../services/tenantService"; // Rule 0G
import WorkflowGuide from "../WorkflowGuide";
import { usePageContext } from "../../hooks/usePageContext";
import InfoTooltip from "../InfoTooltip";
import { ChartCard, ChartTooltip } from "../viz";
import { Zap } from "lucide-react";
import { T } from "../../styles/tokens";

// Design tokens — imported from src/styles/tokens.js (WP-UNIFY)

// ─── DEFAULT CONFIG (includes all WP-O v2.0 fields) ─────────────────────────
const DEFAULT_CONFIG = {
  // Existing fields
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
  // WP-O v2.0: Category multipliers
  mult_cat_cannabis_flower: 2.0,
  mult_cat_cannabis_vape: 1.75,
  mult_cat_cannabis_edible: 1.5,
  mult_cat_seeds_clones: 3.0,
  mult_cat_grow_supplies: 1.0,
  mult_cat_accessories: 0.75,
  mult_cat_health_wellness: 1.5,
  mult_cat_lifestyle_merch: 2.0,
  // WP-O v2.0: Engagement bonuses
  pts_first_online_purchase: 200,
  pts_first_instore_purchase: 100,
  pts_crosssell_trigger: 150,
  pts_birthday_bonus: 100,
  birthday_bonus_active: true,
  pts_content_engagement: 5,
  // WP-O v2.0: Harvest Club tier
  threshold_harvest_club: 2500,
  mult_tier_harvest_club: 2.5,
  // WP-O v2.0: Streak (visit + spend)
  streak_visits_threshold: 3,
  streak_visits_bonus_pts: 50,
  streak_spend_threshold_zar: 1000,
  streak_spend_bonus_pts: 100,
  // WP-O v2.0: AI automation flags
  ai_churn_rescue_enabled: true,
  ai_churn_rescue_threshold_days: 21,
  ai_stock_boost_enabled: true,
  ai_stock_boost_days_on_hand: 90,
  ai_crosssell_nudge_enabled: true,
  ai_margin_guard_pct: 5.0,
  ai_promo_suggestions_enabled: true,
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
    costBg: T.infoLight,
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
    costBg: T.accentLight,
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
    costBg: T.bg,
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
  if (pts >= (cfg.threshold_harvest_club || 2500)) return "Harvest Club";
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
    "Harvest Club": cfg.mult_tier_harvest_club || 2.5,
  };
  return map[tier] || 1.0;
}

const TIER_COLOURS = {
  Bronze: { bg: "#FFF3E0", text: "#92400E", border: "#FDE68A" },
  Silver: { bg: "#F5F5F5", text: "#424242", border: "#BDBDBD" },
  Gold: { bg: "#FFFDE7", text: "#92400E", border: "#FFD54F" },
  Platinum: { bg: T.infoLight, text: T.info, border: T.infoBd },
  "Harvest Club": { bg: T.accentLight, text: T.accent, border: T.accentBd },
};

// ─── Reusable sub-components ─────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, accent }) {
  const ac = accent || T.accent;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.md,
        marginBottom: 20,
        overflow: "hidden",
        boxShadow: T.shadow.sm,
      }}
    >
      <div
        style={{
          borderBottom: `1px solid ${T.border}`,
          padding: "14px 20px",
          borderLeft: `3px solid ${ac}`,
        }}
      >
        <div
          style={{
            fontFamily: T.font,
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
              fontFamily: T.font,
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
            fontFamily: T.font,
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
            fontFamily: T.font,
            fontSize: 12,
            color: T.ink500,
            marginTop: 6,
            lineHeight: 1.55,
            borderLeft: `2px solid ${T.border}`,
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
          border: `1.5px solid ${T.border}`,
          borderRadius: T.radius.sm,
          fontFamily: T.font,
          fontSize: 14,
          fontWeight: 600,
          color: T.accent,
          background: T.surface,
          outline: "none",
          textAlign: "center",
        }}
      />
      {suffix && (
        <span style={{ fontFamily: T.font, fontSize: 13, color: T.ink700 }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function InfoBox({ children, colour, bgColour }) {
  const co = colour || T.info,
    bg = bgColour || T.infoLight;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${co}30`,
        borderRadius: T.radius.md,
        padding: "12px 16px",
        fontFamily: T.font,
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
        background: T.accentLight,
        border: `1px solid ${T.accentBd}`,
        borderRadius: T.radius.md,
        padding: "14px 16px",
        marginTop: 14,
      }}
    >
      <div
        style={{
          fontFamily: T.font,
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
      <span style={{ fontFamily: T.font, fontSize: 12.5, color: T.ink500 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: T.font,
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
        borderRadius: T.radius.md,
        fontFamily: T.font,
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
    { label: "Birthday bonus", key: "pts_birthday", format: (v) => `${v} pts` },
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
  return (
    <div>
      <div
        style={{
          background: T.accentLight,
          border: `1px solid ${T.accentBd}`,
          borderRadius: T.radius.md,
          padding: "18px 22px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: T.font,
            fontSize: 16,
            fontWeight: 600,
            color: T.accent,
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          One-Click Loyalty Schema Selection <InfoTooltip id="loyalty-schema" />
        </div>
        <div
          style={{
            fontFamily: T.font,
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
                borderRadius: T.radius.sm,
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
                background: T.surface,
                border: `1.5px solid ${active ? schema.costColor : T.border}`,
                borderRadius: T.radius.lg,
                overflow: "hidden",
                boxShadow: active
                  ? `0 4px 16px ${schema.costColor}18`
                  : T.shadow.sm,
              }}
            >
              <div
                style={{
                  background: active ? schema.costColor : T.bg,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: T.font,
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
                      fontFamily: T.font,
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
                      borderRadius: T.radius.sm,
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
              <div style={{ padding: "16px 20px" }}>
                <span
                  style={{
                    display: "inline-block",
                    background: schema.costBg,
                    color: schema.costColor,
                    border: `1px solid ${schema.costColor}30`,
                    borderRadius: T.radius.sm,
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
                    fontFamily: T.font,
                    fontSize: 12.5,
                    color: T.ink700,
                    lineHeight: 1.65,
                    marginBottom: 14,
                  }}
                >
                  {schema.description}
                </div>
                <div
                  style={{
                    background: T.bg,
                    borderRadius: T.radius.md,
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
                            ? `1px solid ${T.border}`
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: T.font,
                          fontSize: 12,
                          color: T.ink500,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontFamily: T.font,
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
                        fontFamily: T.font,
                        fontSize: 12,
                        color: T.ink700,
                        marginBottom: 10,
                        background: T.warningLight,
                        padding: "8px 12px",
                        borderRadius: T.radius.sm,
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
                          borderRadius: T.radius.md,
                          fontFamily: T.font,
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
                          border: `1px solid ${T.border}`,
                          borderRadius: T.radius.md,
                          fontFamily: T.font,
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
                      borderRadius: T.radius.md,
                      fontFamily: T.font,
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
              fontFamily: T.font,
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
                    color: T.ink500,
                    textTransform: "uppercase",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    borderBottom: `2px solid ${T.border}`,
                    background: T.bg,
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
                  style={{ background: i % 2 === 0 ? T.bg : "#fff" }}
                >
                  <td
                    style={{
                      padding: "9px 14px",
                      color: T.ink700,
                      fontWeight: 500,
                      borderBottom: `1px solid ${T.border}`,
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
                          fontFamily: T.font,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? s.costColor : T.ink700,
                          borderBottom: `1px solid ${T.border}`,
                          background: isActive
                            ? `${s.costColor}06`
                            : "transparent",
                        }}
                      >
                        {val !== undefined ? row.format(val) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            style={{ borderTop: `1px solid ${T.border}`, margin: "8px 0" }}
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
            label="Cost to store (after breakage)"
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
        title="First Purchase Bonuses"
        subtitle="One-time conversion rewards — highest ROI loyalty action"
        accent={T.accentMid}
      >
        <FieldRow
          label="First online purchase (one-time)"
          explanation="Awarded once per customer on their very first completed online order. This is the channel-switching moment."
        >
          <NumInput
            value={cfg.pts_first_online_purchase || 200}
            onChange={(v) => setField("pts_first_online_purchase", v)}
            min={0}
            max={2000}
            step={50}
            suffix="pts"
          />
        </FieldRow>
        <FieldRow
          label="First in-store purchase (one-time)"
          explanation="Awarded once per customer on their first confirmed in-store purchase."
        >
          <NumInput
            value={cfg.pts_first_instore_purchase || 100}
            onChange={(v) => setField("pts_first_instore_purchase", v)}
            min={0}
            max={1000}
            step={25}
            suffix="pts"
          />
        </FieldRow>
        <FieldRow
          label="Cross-sell bonus (one per new category)"
          explanation="Automatically awarded when a customer makes their first purchase in a second product category. E.g. cannabis customer buying grow supplies for the first time."
        >
          <NumInput
            value={cfg.pts_crosssell_trigger || 150}
            onChange={(v) => setField("pts_crosssell_trigger", v)}
            min={0}
            max={1000}
            step={25}
            suffix="pts"
          />
        </FieldRow>
      </SectionCard>
      <SectionCard
        title="Streak & Birthday Bonuses"
        subtitle="Bonus points for consistent behaviour and birthdays"
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
        <FieldRow label="Scans per streak">
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
          explanation="Points auto-awarded in the customer's birthday month."
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
        <FieldRow
          label="Educational content (per session)"
          explanation="Awarded once per session when customer reads molecule, terpene, or strain education pages."
        >
          <NumInput
            value={cfg.pts_content_engagement || 5}
            onChange={(v) => setField("pts_content_engagement", v)}
            min={0}
            max={50}
            step={1}
            suffix="pts"
          />
        </FieldRow>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Category Multipliers (NEW — WP-O v2.0) ─────────────────────────────
function TabCategories({ draft, setDraft }) {
  const cfg = draft;
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const costPerPt = cfg.redemption_value_zar * (1 - cfg.breakage_rate);
  const baseOnline300 =
    (300 / 100) * cfg.pts_per_r100_online * (1 + cfg.online_bonus_pct / 100);

  const CATEGORIES = [
    {
      key: "mult_cat_cannabis_flower",
      label: "Cannabis Flower",
      desc: "Flower, pre-rolls, hash, kief",
      margin: "60–70%",
      rationale: "Highest repeat purchase — reward loyalty hard",
    },
    {
      key: "mult_cat_cannabis_vape",
      label: "Cannabis Vape",
      desc: "Cartridges, disposables, pods",
      margin: "55–65%",
      rationale: "Good margin — drive channel preference",
    },
    {
      key: "mult_cat_cannabis_edible",
      label: "Cannabis Edibles",
      desc: "Gummies, chocolate, beverages",
      margin: "50–65%",
      rationale: "Variable margin — balanced earn",
    },
    {
      key: "mult_cat_seeds_clones",
      label: "Seeds & Clones",
      desc: "Feminised seeds, live clones, plugs, trays",
      margin: "65–80%",
      rationale: "Highest value — builds lifelong grower loyalty",
    },
    {
      key: "mult_cat_grow_supplies",
      label: "Grow Supplies",
      desc: "Nutrients, substrate, fertilizer, rooting gel",
      margin: "30–45%",
      rationale: "Lower margin — neutral earn, cross-sell play",
    },
    {
      key: "mult_cat_accessories",
      label: "Accessories",
      desc: "Papers, cones, Boveda, grinders, trays",
      margin: "35–55%",
      rationale: "Competitive pricing — lower earn to protect margin",
    },
    {
      key: "mult_cat_health_wellness",
      label: "Health & Wellness",
      desc: "Lion's Mane, Ashwagandha, CBD pet, mushrooms",
      margin: "45–60%",
      rationale: "Growth category — reward to build habit",
    },
    {
      key: "mult_cat_lifestyle_merch",
      label: "Lifestyle & Merch",
      desc: "Branded clothing, caps, accessories",
      margin: "60–75%",
      rationale: "Brand advocacy — high margin, reward ambassadors",
    },
  ];

  // Margin guard: warn if loyalty cost > ai_margin_guard_pct% of lower end of margin range
  function isMarginGuardTriggered(catKey, marginLow) {
    const mult = cfg[catKey] || 1.0;
    const ptsPerR100 =
      cfg.pts_per_r100_online * (1 + cfg.online_bonus_pct / 100) * mult;
    const loyaltyCostPctRev = (ptsPerR100 / 100) * costPerPt * 100;
    return (
      loyaltyCostPctRev > (marginLow * (cfg.ai_margin_guard_pct || 5)) / 100
    );
  }

  return (
    <div>
      <SectionCard
        title="Product Category Earn Multipliers"
        subtitle="Applied on top of the base earn rate. Reflects actual margin by category."
        accent={T.accentMid}
      >
        <InfoBox colour={T.info} bgColour={T.infoLight}>
          <strong>How category multipliers work:</strong> Final points = base
          earn rate × online bonus × <strong>category multiplier</strong> × tier
          multiplier. Set each multiplier to match the margin that category
          generates. Higher margin = higher multiplier = more loyalty investment
          is justified.
        </InfoBox>
      </SectionCard>

      {CATEGORIES.map((cat) => {
        const mult = cfg[cat.key] || 1.0;
        const ptsPreview = Math.round(baseOnline300 * mult);
        const costPreview = ptsPreview * costPerPt;
        const marginLow = parseFloat(cat.margin.split("–")[0]);
        const guardTriggered = isMarginGuardTriggered(cat.key, marginLow);

        return (
          <SectionCard
            key={cat.key}
            title={cat.label}
            subtitle={cat.desc}
            accent={guardTriggered ? T.warning : T.accent}
          >
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <FieldRow label="Earn multiplier" explanation={cat.rationale}>
                  <NumInput
                    value={mult}
                    onChange={(v) => setField(cat.key, v)}
                    min={0.1}
                    max={10}
                    step={0.25}
                    suffix="×"
                    width={70}
                  />
                </FieldRow>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      borderRadius: T.radius.sm,
                      padding: "2px 8px",
                      fontSize: 11,
                      color: T.ink500,
                    }}
                  >
                    Est. gross margin: {cat.margin}
                  </span>
                  {guardTriggered && (
                    <span
                      style={{
                        background: T.warningLight,
                        border: `1px solid ${T.warningBd}`,
                        borderRadius: T.radius.sm,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.warning,
                      }}
                    >
                      ⚠ Approaching margin guard ({cfg.ai_margin_guard_pct || 5}
                      %)
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  background: T.accentLight,
                  border: `1px solid ${T.accentBd}`,
                  borderRadius: T.radius.md,
                  padding: "12px 16px",
                  minWidth: 220,
                }}
              >
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.accentMid,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  R300 purchase preview
                </div>
                <PreviewLine
                  label={`Base earn × ${mult}× category`}
                  value={`${ptsPreview} pts`}
                  highlight
                />
                <PreviewLine
                  label="Value to customer"
                  value={`R${(ptsPreview * cfg.redemption_value_zar).toFixed(2)}`}
                />
                <PreviewLine
                  label="Cost to store"
                  value={`R${costPreview.toFixed(2)} (${((costPreview / 300) * 100).toFixed(2)}%)`}
                />
              </div>
            </div>
          </SectionCard>
        );
      })}

      <SectionCard
        title="Setting loyalty_category on Products"
        subtitle="Required for category multipliers to apply at scan and checkout time"
        accent={T.info}
      >
        <InfoBox colour={T.info} bgColour={T.infoLight}>
          <strong>Next step:</strong> In HQ Stock, set the{" "}
          <code>loyalty_category</code> field on each inventory item to one of
          the 8 categories above. Items without a category earn at the base rate
          (1.0× neutral multiplier). Products with a <code>pts_override</code>{" "}
          value bypass the category multiplier entirely — useful for
          limited-time promotions on specific SKUs.
        </InfoBox>
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
            gap: 8,
          }}
        >
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: T.radius.md,
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.accent,
                  }}
                >
                  {cfg[cat.key] || 1.0}×
                </div>
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 10,
                    color: T.ink500,
                  }}
                >
                  {cat.key.replace("mult_cat_", "")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Tiers ───────────────────────────────────────────────────────────────
function TabTiers({ draft, setDraft, atRiskCustomers }) {
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
    {
      name: "Harvest Club",
      threshold: cfg.threshold_harvest_club || 2500,
      multKey: "mult_tier_harvest_club",
      thKey: "threshold_harvest_club",
      colour: TIER_COLOURS["Harvest Club"],
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
  return (
    <div>
      <SectionCard title="Tier Thresholds & Multipliers">
        <InfoBox colour={T.info} bgColour={T.infoLight}>
          <strong>Harvest Club</strong> is the elite tier for customers who shop
          both sides of the store — cannabis + grow supplies + health. It
          rewards multi-category loyalty with the highest earn multiplier (
          {cfg.mult_tier_harvest_club || 2.5}×). These customers have the
          highest LTV.
        </InfoBox>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
            gap: 16,
            marginTop: 16,
            marginBottom: 20,
          }}
        >
          {tiers.map((tier) => (
            <div
              key={tier.name}
              style={{
                background: tier.colour.bg,
                border: `1.5px solid ${tier.colour.border}`,
                borderRadius: T.radius.md,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 15,
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
                      fontFamily: T.font,
                      fontSize: 10,
                      color: T.ink500,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Reaches at <InfoTooltip id="loyalty-threshold" />
                  </div>
                  <NumInput
                    value={cfg[tier.thKey] || 0}
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
                    fontFamily: T.font,
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
                    fontFamily: T.font,
                    fontSize: 10,
                    color: T.ink500,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  Earn multiplier <InfoTooltip id="loyalty-multiplier" />
                </div>
                <NumInput
                  value={cfg[tier.multKey] || 1.0}
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
        <PreviewBox title="Tier Journey — Time to reach each tier">
          {[
            { label: "Bronze → Silver", pts: cfg.threshold_silver },
            { label: "Silver → Gold", pts: cfg.threshold_gold },
            { label: "Gold → Platinum", pts: cfg.threshold_platinum },
            {
              label: "Platinum → Harvest Club",
              pts: cfg.threshold_harvest_club || 2500,
            },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                marginBottom: 10,
                paddingBottom: 10,
                borderBottom: i < 3 ? `1px solid ${T.border}` : "none",
              }}
            >
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.ink700,
                  marginBottom: 3,
                }}
              >
                {step.label} — {step.pts} pts
              </div>
              <div
                style={{ fontFamily: T.font, fontSize: 12, color: T.ink500 }}
              >
                Scanning once/week: ~{weeksToTier(step.pts)} weeks · Buying
                R400/month online: ~{monthsToTierBuying(step.pts)} months
              </div>
            </div>
          ))}
        </PreviewBox>
      </SectionCard>

      {/* At-risk segment — live data */}
      <SectionCard
        title="At-Risk Tier Customers"
        subtitle="Haven't purchased in 21+ days — at risk of losing tier status"
        accent={T.warning}
      >
        {atRiskCustomers && atRiskCustomers.length > 0 ? (
          <div>
            {atRiskCustomers.map((customer, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom:
                    i < atRiskCustomers.length - 1
                      ? `1px solid ${T.border}`
                      : "none",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: T.font,
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.ink900,
                    }}
                  >
                    {customer.full_name || "Customer"}
                  </div>
                  <div
                    style={{
                      fontFamily: T.font,
                      fontSize: 11,
                      color: T.ink500,
                    }}
                  >
                    {customer.loyalty_tier} tier · Last active:{" "}
                    {customer.days_since} days ago
                  </div>
                </div>
                <span
                  style={{
                    background: T.warningLight,
                    color: T.warning,
                    border: `1px solid ${T.warningBd}`,
                    borderRadius: T.radius.sm,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  At risk
                </span>
              </div>
            ))}
            <InfoBox colour={T.warning} bgColour={T.warningLight}>
              <strong>Action:</strong> Use the AI Engine tab to trigger
              automated WhatsApp re-engagement for these customers, or send a
              manual campaign via AdminCommsCenter.
            </InfoBox>
          </div>
        ) : (
          <div
            style={{
              fontFamily: T.font,
              fontSize: 13,
              color: T.ink500,
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            No at-risk tier customers right now. Check back as your programme
            grows.
          </div>
        )}
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

  // Programme Health Score (1–10)
  function calcHealthScore() {
    let score = 5.0;
    const redemptionRate = parseFloat(actualRedemptionRate);
    const breakagePct = cfg.breakage_rate * 100;
    if (redemptionRate < breakagePct * 1.2) score += 1.0; // redemption tracking model
    if (liveStats?.totalPtsIssued > 0) score += 0.5; // programme is active
    if (parseFloat(costAsPctRev) < 2) score += 1.0; // cost is low
    if (parseFloat(costAsPctRev) < 1) score += 0.5; // cost is very low
    if (liveStats?.totalPtsIssued30d > 100) score += 1.0; // active last 30d
    if (liveStats?.totalPtsRedeemed > 0) score += 1.0; // redemptions happening
    return Math.min(10, Math.max(1, score)).toFixed(1);
  }
  const healthScore = parseFloat(calcHealthScore());
  const healthColour =
    healthScore >= 7 ? T.success : healthScore >= 4 ? T.warning : T.danger;
  const healthBg =
    healthScore >= 7
      ? T.successLight
      : healthScore >= 4
        ? T.warningLight
        : T.dangerLight;
  const healthLabel =
    healthScore >= 7
      ? "Good"
      : healthScore >= 4
        ? "Needs attention"
        : "Action required";

  return (
    <div>
      {/* Programme Health Score */}
      <SectionCard title="Programme Health Score" accent={healthColour}>
        <div
          style={{
            background: healthBg,
            border: `1px solid ${healthColour}30`,
            borderRadius: T.radius.md,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 48,
                fontWeight: 700,
                color: healthColour,
                lineHeight: 1,
              }}
            >
              {healthScore}
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 11,
                color: healthColour,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              /10
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 16,
                fontWeight: 600,
                color: healthColour,
                marginBottom: 8,
              }}
            >
              {healthLabel}
            </div>
            <div
              style={{
                height: 8,
                background: `${healthColour}20`,
                borderRadius: T.radius.sm,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(healthScore / 10) * 100}%`,
                  background: healthColour,
                  borderRadius: T.radius.sm,
                  transition: "width 0.6s",
                }}
              />
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: 12,
                color: T.ink500,
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              Score based on: programme activity, redemption vs breakage
              alignment, cost as % revenue, and engagement trends. Aim for 7+.
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Redemption Settings">
        <FieldRow
          label={
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              1 point = R___ value to customer{" "}
              <InfoTooltip id="loyalty-redemption-value" />
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
            style={{ borderTop: `1px solid ${T.border}`, margin: "8px 0" }}
          />
          <PreviewLine
            label="Actual cost per point issued"
            value={`R${costPerPt.toFixed(3)}`}
            highlight
          />
        </PreviewBox>
      </SectionCard>

      {/* Charts */}
      {liveStats &&
        (() => {
          const totalIssued = liveStats.totalPtsIssued || 0;
          const totalRedeemed = liveStats.totalPtsRedeemed || 0;
          const outstanding = Math.max(0, totalIssued - totalRedeemed);
          const donutData = [
            { name: "Redeemed", value: totalRedeemed },
            { name: "Outstanding", value: outstanding },
          ].filter((d) => d.value > 0);
          const DONUT_COLOURS = [T.accentMid, T.info];
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
              <ChartCard title="Points Issued vs Redeemed" subtitle="All time vs last 30 days" accent="green" height={220}>
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
                          stopOpacity={0.42}
                        />
                        <stop
                          offset="95%"
                          stopColor={T.accentMid}
                          stopOpacity={0.02}
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
                          stopOpacity={0.35}
                        />
                        <stop offset="95%" stopColor={T.info} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      horizontal
                      vertical={false}
                      stroke={T.border}
                      strokeWidth={0.5}
                    />
                    <XAxis
                      dataKey="period"
                      tick={{
                        fill: T.ink500,
                        fontSize: 10,
                        fontFamily: T.font,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{
                        fill: T.ink500,
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
                      isAnimationActive={true}
                      animationDuration={700}
                      animationEasing="ease-out"
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
              <ChartCard title="Points Balance" subtitle="Redeemed vs outstanding" accent="purple" height={220}>
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
                      isAnimationActive={true}
                      animationDuration={600}
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
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius.md,
                    padding: "12px 14px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.font,
                      fontSize: 20,
                      fontWeight: 700,
                      color: c,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontFamily: T.font,
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
              fontFamily: T.font,
              fontSize: 13,
              color: T.ink500,
              textAlign: "center",
              padding: 30,
            }}
          >
            Loading live transaction data...
          </div>
        )}
        <InfoBox colour={T.info} bgColour={T.infoLight}>
          Your loyalty programme costs{" "}
          <strong>{costAsPctRev}% of revenue</strong>. The average customer
          acquisition cost via paid ads is R200–500. Your programme acquires and
          retains customers for a fraction of that.
        </InfoBox>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Referrals ───────────────────────────────────────────────────────────
function TabReferrals({ draft, setDraft, referralLeaderboard, tenantName }) {
  const cfg = draft;
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const storeName = tenantName || "our store";

  function buildWhatsAppMessage(code) {
    return encodeURIComponent(
      `I shop at ${storeName} — use my code ${code} at checkout for ${cfg.pts_referral_referee} bonus points! 🌿`,
    );
  }

  return (
    <div>
      <SectionCard title="Referral Programme Settings">
        <FieldRow
          label="Points to the referrer"
          explanation="Awarded when the referred friend completes their first confirmed order."
        >
          <NumInput
            value={cfg.pts_referral_referrer}
            onChange={(v) => setField("pts_referral_referrer", v)}
            min={0}
            max={1000}
            step={10}
            suffix="pts per referral"
          />
        </FieldRow>
        <FieldRow
          label="Points to the new customer"
          explanation="Awarded to the new customer on their first completed order using the referral code."
        >
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
        <InfoBox colour={T.info} bgColour={T.infoLight}>
          <strong>How it works:</strong> Each customer gets a unique code
          (visible on their Loyalty page + Account page). New customer enters
          code at checkout. Both parties earn points when the first order is
          confirmed. Referrer earns {cfg.pts_referral_referrer} pts per referral
          — no cap.
        </InfoBox>
      </SectionCard>

      <SectionCard
        title="Top Referrers"
        subtitle="Live from referral_codes — all scoped to this store"
        accent={T.info}
      >
        {referralLeaderboard && referralLeaderboard.length > 0 ? (
          referralLeaderboard.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: i === 0 ? T.infoLight : T.bg,
                borderRadius: T.radius.md,
                marginBottom: 6,
                border: `1px solid ${i === 0 ? T.infoBd : T.border}`,
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
                    fontFamily: T.font,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: T.font,
                      fontSize: 13,
                      fontWeight: 600,
                      color: T.ink900,
                    }}
                  >
                    {entry.name || entry.code}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontFamily: T.font,
                        fontSize: 11,
                        color: T.ink500,
                      }}
                    >
                      Code: {entry.code}
                    </span>
                    {/* WhatsApp share for referral code preview */}
                    <a
                      href={`https://wa.me/?text=${buildWhatsAppMessage(entry.code)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        background: "#25D366",
                        color: "#fff",
                        borderRadius: T.radius.sm,
                        padding: "1px 7px",
                        fontSize: 10,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Share ↗
                    </a>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 18,
                    fontWeight: 700,
                    color: T.info,
                  }}
                >
                  {entry.uses_count} referrals
                </div>
                <div
                  style={{
                    fontFamily: T.font,
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
              fontFamily: T.font,
              fontSize: 13,
              color: T.ink500,
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No referral data yet. Referral codes are shown on each customer's
            Loyalty page.
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="WhatsApp Share Preview"
        subtitle="This is what customers share when they tap the WhatsApp button on their Loyalty page"
        accent={T.accentMid}
      >
        <div
          style={{
            background: "#DCF8C6",
            border: "1px solid #A8D99C",
            borderRadius: T.radius.md,
            padding: "14px 16px",
            maxWidth: 360,
          }}
        >
          <div
            style={{
              fontFamily: T.font,
              fontSize: 13,
              color: "#1a1a1a",
              lineHeight: 1.6,
            }}
          >
            I shop at <strong>{storeName}</strong> — use my code{" "}
            <strong>EXAMPLE</strong> at checkout for{" "}
            <strong>{cfg.pts_referral_referee} bonus points!</strong> 🌿
          </div>
        </div>
        <div
          style={{
            fontFamily: T.font,
            fontSize: 12,
            color: T.ink500,
            marginTop: 8,
          }}
        >
          Customer's actual code replaces EXAMPLE above. Message pre-populates
          in WhatsApp — customer just hits send.
        </div>
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
        <InfoBox colour={T.info} bgColour={T.infoLight}>
          <strong>How product QR codes are protected:</strong>
          <br />
          • HMAC-signed by sign-qr edge function (deployed --no-verify-jwt)
          <br />
          • Bound to inventory_item_id — not reusable across products
          <br />
          • One-time claim: first scan sets claimed = true
          <br />
          • Hard server-side cap: max_scans_per_qr enforced at scan time
          <br />
          • Instant kill: is_active = false via AdminQRCodes
          <br />• Screenshot sharing earns nothing after first claim
        </InfoBox>
      </SectionCard>
      {qrStats && (
        <SectionCard
          title="Live QR Stats"
          subtitle="Scoped to this store's inventory_items"
          accent={T.info}
        >
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
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius.md,
                    padding: "10px 14px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.font,
                      fontSize: 22,
                      fontWeight: 700,
                      color: c,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontFamily: T.font,
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
                fontFamily: T.font,
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
                background: T.surface,
                border: `1.5px solid ${s.color}40`,
                borderRadius: T.radius.md,
                overflow: "hidden",
              }}
            >
              <div style={{ background: s.color, padding: "10px 16px" }}>
                <div
                  style={{
                    fontFamily: T.font,
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
                      borderBottom: i < 3 ? `1px solid ${T.border}` : "none",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: T.font,
                        fontSize: 12,
                        color: T.ink500,
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontFamily: T.font,
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
                      borderRadius: T.radius.md,
                      background: gain > 0 ? T.successLight : T.dangerLight,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: 13,
                        fontWeight: 700,
                        color: gain > 0 ? T.success : T.danger,
                      }}
                    >
                      {gain > 0 ? "▲ +" : "▼ "}R
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

// ─── Tab: AI Engine (NEW — WP-O v2.0) ────────────────────────────────────────
function TabAIEngine({ draft, setDraft, aiLog, loadingAiLog, tenantName, onRunNow, runningAi }) {
  const cfg = draft;
  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const AUTOMATIONS = [
    {
      key: "ai_churn_rescue_enabled",
      label: "Churn Rescue",
      desc: `Triggers WhatsApp re-engagement when a Gold+ customer goes silent for ${cfg.ai_churn_rescue_threshold_days || 21} days.`,
      thresholdKey: "ai_churn_rescue_threshold_days",
      thresholdSuffix: "days",
    },
    {
      key: "ai_stock_boost_enabled",
      label: "Stock-Linked Boost",
      desc: `Suggests a points multiplier boost when a product has more than ${cfg.ai_stock_boost_days_on_hand || 90} days stock on hand.`,
      thresholdKey: "ai_stock_boost_days_on_hand",
      thresholdSuffix: "days on hand",
    },
    {
      key: "ai_crosssell_nudge_enabled",
      label: "Cross-Sell Nudge",
      desc: "Identifies single-category customers and suggests cross-sell offers to move them to multi-category buying.",
      thresholdKey: null,
    },
    {
      key: "ai_promo_suggestions_enabled",
      label: "Promo Suggestions",
      desc: "Weekly AI analysis of programme performance with actionable recommendations surfaced in this tab.",
      thresholdKey: null,
    },
  ];

  const ACTION_COLOURS = {
    churn_rescue: {
      bg: T.dangerLight,
      border: T.dangerBd,
      label: "Churn Rescue",
      c: T.danger,
    },
    stock_boost_suggestion: {
      bg: T.warningLight,
      border: T.warningBd,
      label: "Stock Boost",
      c: T.warning,
    },
    crosssell_nudge: {
      bg: T.infoLight,
      border: T.infoBd,
      label: "Cross-Sell",
      c: T.info,
    },
    promo_suggestion: {
      bg: T.accentLight,
      border: T.accentBd,
      label: "Promo",
      c: T.accent,
    },
    weekly_brief: {
      bg: T.successLight,
      border: T.successBd,
      label: "Weekly Brief",
      c: T.success,
    },
  };

  return (
    <div>
      {/* Automation Status */}
      <SectionCard
        title="AI Automation Status"
        subtitle="All actions are logged to loyalty_ai_log — full audit trail"
        accent={T.accentMid}
      >
        {/* Run Now button */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0 16px",borderBottom:`1px solid ${T.border}`,marginBottom:16}}>
          <div>
            <div style={{fontFamily:T.font,fontSize:13,fontWeight:600,color:T.ink900}}>loyalty-ai Edge Function</div>
            <div style={{fontFamily:T.font,fontSize:11,color:T.success,marginTop:2,display:"flex",alignItems:"center",gap:6}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:T.success,display:"inline-block"}}/>
              ACTIVE {"\u2014"} deployed {"\u00b7"} runs nightly at 2am
            </div>
          </div>
          <button
            onClick={onRunNow}
            disabled={runningAi}
            style={{padding:"8px 18px",background:runningAi?"#9CA3AF":T.accentMid,color:"#fff",border:"none",borderRadius:6,fontFamily:T.font,fontSize:12,fontWeight:700,cursor:runningAi?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}
          >
            {runningAi?(
              <><span style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>Running{"\u2026"}</>
            ):<><Zap size={13} strokeWidth={1.5} style={{ marginRight: 4 }} />Run Now</>}
          </button>
        </div>
        {AUTOMATIONS.map((auto) => (
          <div
            key={auto.key}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              padding: "14px 0",
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div style={{ paddingTop: 2 }}>
              <div
                onClick={() => setField(auto.key, !cfg[auto.key])}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: cfg[auto.key] ? T.accentMid : T.ink300,
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: cfg[auto.key] ? 18 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: T.surface,
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: T.font,
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.ink900,
                  }}
                >
                  {auto.label}
                </span>
                <span
                  style={{
                    background: cfg[auto.key] ? T.successLight : T.bg,
                    color: cfg[auto.key] ? T.success : T.ink500,
                    border: `1px solid ${cfg[auto.key] ? T.successBd : T.border}`,
                    borderRadius: T.radius.sm,
                    padding: "1px 7px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {cfg[auto.key] ? "ACTIVE" : "PAUSED"}
                </span>
              </div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 12,
                  color: T.ink500,
                  lineHeight: 1.5,
                }}
              >
                {auto.desc}
              </div>
              {auto.thresholdKey && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.font,
                      fontSize: 12,
                      color: T.ink500,
                    }}
                  >
                    Threshold:
                  </span>
                  <NumInput
                    value={cfg[auto.thresholdKey] || 21}
                    onChange={(v) => setField(auto.thresholdKey, v)}
                    min={1}
                    max={365}
                    step={1}
                    suffix={auto.thresholdSuffix}
                    width={70}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        <div style={{ padding: "14px 0" }}>
          <FieldRow
            label="Margin guard threshold"
            explanation="Alert when loyalty cost for any category exceeds this % of estimated gross margin."
          >
            <NumInput
              value={cfg.ai_margin_guard_pct || 5.0}
              onChange={(v) => setField("ai_margin_guard_pct", v)}
              min={1}
              max={30}
              step={0.5}
              suffix="% of category margin"
            />
          </FieldRow>
        </div>
      </SectionCard>

      {/* AI Actions Feed */}
      <SectionCard
        title="AI Actions Feed"
        subtitle="Recent AI-initiated loyalty actions — all logged to loyalty_ai_log"
        accent={T.info}
      >
        {loadingAiLog ? (
          <div
            style={{
              fontFamily: T.font,
              fontSize: 13,
              color: T.ink500,
              textAlign: "center",
              padding: 24,
            }}
          >
            Loading AI actions...
          </div>
        ) : aiLog && aiLog.length > 0 ? (
          aiLog.map((entry, i) => {
            const colours =
              ACTION_COLOURS[entry.action_type] ||
              ACTION_COLOURS.promo_suggestion;
            const payload = entry.payload || {};
            return (
              <div
                key={i}
                style={{
                  background: colours.bg,
                  border: `1px solid ${colours.border}`,
                  borderRadius: T.radius.md,
                  padding: "12px 14px",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      background: colours.c,
                      color: "#fff",
                      borderRadius: T.radius.sm,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {colours.label}
                  </span>
                  <span
                    style={{
                      fontFamily: T.font,
                      fontSize: 11,
                      color: T.ink500,
                    }}
                  >
                    {new Date(entry.created_at).toLocaleDateString("en-ZA")}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      background:
                        entry.outcome === "actioned"
                          ? T.successLight
                          : entry.outcome === "dismissed"
                            ? T.bg
                            : T.warningLight,
                      color:
                        entry.outcome === "actioned"
                          ? T.success
                          : entry.outcome === "dismissed"
                            ? T.ink500
                            : T.warning,
                      border: `1px solid ${entry.outcome === "actioned" ? T.successBd : entry.outcome === "dismissed" ? T.border : T.warningBd}`,
                      borderRadius: T.radius.sm,
                      padding: "1px 7px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {entry.outcome?.toUpperCase() || "PENDING"}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 12,
                    color: T.ink700,
                    lineHeight: 1.5,
                  }}
                >
                  {payload.message ||
                    payload.recommendation ||
                    `${colours.label} action — see payload for details.`}
                </div>
              </div>
            );
          })
        ) : (
          <div
            style={{
              fontFamily: T.font,
              fontSize: 13,
              color: T.ink500,
              textAlign: "center",
              padding: "30px 0",
            }}
          >
            No AI actions yet. The loyalty-ai edge function runs nightly and
            will populate this feed once the programme has enough data.
            <div
              style={{
                marginTop: 12,
                fontFamily: T.font,
                fontSize: 12,
                color: T.ink300,
              }}
            >
              Actions appear here for: churn rescue · stock boost suggestions ·
              cross-sell nudges · weekly briefs
            </div>
          </div>
        )}
      </SectionCard>

      {/* What the AI engine will do */}
      <SectionCard
        title="AI Engine — What Runs Nightly"
        subtitle="loyalty-ai edge function: 7 automated jobs at 2am daily"
        accent={T.warning}
      >
        {[
          {
            title: "Churn Scoring",
            desc: "Calculates churn_risk_score (0–1) for every active customer based on recency, tier, and spend trend. Updates user_profiles.",
          },
          {
            title: "Churn Rescue WhatsApp",
            desc: `Sends personalised WhatsApp re-engagement to Gold+ customers silent for ${cfg.ai_churn_rescue_threshold_days || 21}+ days. Logs to loyalty_ai_log.`,
          },
          {
            title: "Stock-Linked Boost Suggestions",
            desc: `Identifies inventory_items with >${cfg.ai_stock_boost_days_on_hand || 90} days stock on hand. Suggests pts multiplier boost to drive clearance.`,
          },
          {
            title: "Cross-Sell Intelligence",
            desc: "Identifies single-category buyers. Creates nudge records in loyalty_ai_log for targeted WhatsApp campaigns.",
          },
          {
            title: "Birthday Bonuses",
            desc: "Daily check: awards pts_birthday_bonus to customers whose birthday month matches today. Dedup-safe — one award per year.",
          },
          {
            title: "Point Expiry",
            desc: "Marks expired points (is_expired = true). Updates user_profiles.loyalty_points to deduct expired balance. Logs recaptured liability.",
          },
          {
            title: "Weekly Programme Brief",
            desc: "Monday: compiles Health Score, wins, warnings, and opportunities. Surfaces in this tab's AI Actions Feed.",
          },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              padding: "10px 0",
              borderBottom: i < 6 ? `1px solid ${T.border}` : "none",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.ink900,
                  marginBottom: 2,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 12,
                  color: T.ink500,
                  lineHeight: 1.5,
                }}
              >
                {item.desc}
              </div>
            </div>
          </div>
        ))}
        <InfoBox colour={T.success} bgColour={T.successLight}>
          <strong>Edge function status:</strong> loyalty-ai v1 is ACTIVE on Supabase Functions.
          Use "Run Now" to trigger manually, or it runs automatically at 2am nightly via pg_cron.
          All automation toggles above control which jobs execute per run.
        </InfoBox>
      </SectionCard>
    </div>
  );
}

// ─── Tab: Campaigns ───────────────────────────────────────────────────────────
function TabCampaigns({ showToast, tenantId }) {
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
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("double_points_campaigns")
        .select("*")
        .eq("tenant_id", tenantId) // tenant-scoped
        .order("start_date", { ascending: false });
      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      showToast("Failed to load campaigns: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, tenantId]);

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
            tenant_id: tenantId,
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
    border: `1.5px solid ${T.border}`,
    borderRadius: T.radius.md,
    fontFamily: T.font,
    fontSize: 14,
    color: T.ink900,
    background: T.surface,
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
              borderRadius: T.radius.md,
              fontFamily: T.font,
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
              background: T.warningLight,
              border: `1.5px solid ${T.warningBd}`,
              borderRadius: T.radius.md,
              padding: "20px 24px",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontFamily: T.font,
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
                      fontFamily: T.font,
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
                    fontFamily: T.font,
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
                  fontFamily: T.font,
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
                  borderRadius: T.radius.md,
                  fontFamily: T.font,
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
                  border: `1px solid ${T.border}`,
                  borderRadius: T.radius.md,
                  fontFamily: T.font,
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
              fontFamily: T.font,
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
              fontFamily: T.font,
              fontSize: 13,
              color: T.ink500,
              textAlign: "center",
              padding: "30px 0",
            }}
          >
            No campaigns yet. Create one to double your customers' points during
            a promotion.
          </div>
        ) : (
          <div>
            {campaigns.map((c) => {
              const active = isActive(c),
                upcoming = c.is_active && c.start_date > today,
                past = c.end_date < today;
              let statusColor = T.ink500,
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
                    borderRadius: T.radius.md,
                    background: active ? T.successLight : T.bg,
                    border: `1.5px solid ${active ? T.successBd : T.border}`,
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
                          fontFamily: T.font,
                          fontSize: 14,
                          fontWeight: 600,
                          color: T.ink900,
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        style={{
                          fontFamily: T.font,
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
                        fontFamily: T.font,
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
                        background: c.is_active ? T.warningLight : T.successLight,
                        border: `1px solid ${c.is_active ? T.warningBd : T.successBd}`,
                        borderRadius: T.radius.sm,
                        fontFamily: T.font,
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
                        background: T.infoLight,
                        border: `1px solid ${T.infoBd}`,
                        borderRadius: T.radius.sm,
                        fontFamily: T.font,
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
                        background: T.dangerLight,
                        border: `1px solid ${T.dangerBd}`,
                        borderRadius: T.radius.sm,
                        fontFamily: T.font,
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
        <InfoBox colour={T.warning} bgColour={T.warningLight}>
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
  const { tenant, tenantName } = useTenant(); // Rule 0G — inside component
  const tenantId = tenant?.id;

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
  const [atRiskCustomers, setAtRiskCustomers] = useState([]);
  const [aiLog, setAiLog] = useState([]);
  const [loadingAiLog, setLoadingAiLog] = useState(false);
  const [runningAi, setRunningAi] = useState(false);

  // 10 tabs: Schema, Earning, Categories, Tiers, Economics, Referrals, QR Security, Simulator, AI Engine, Campaigns
  const SUB_TABS = [
    { label: "Schema", key: "schema" },
    { label: "Earning Rules", key: "earning" },
    { label: "Categories", key: "categories" },
    { label: "Tiers", key: "tiers" },
    { label: "Economics", key: "economics" },
    { label: "Referrals", key: "referrals" },
    { label: "QR Security", key: "qrsecurity" },
    { label: "Simulator", key: "simulator" },
    { label: "AI Engine", key: "aiengine" },
    { label: "Campaigns", key: "campaigns" },
  ];

  // Config tabs = 1 through 7 (Earning → Simulator). Schema(0), AI Engine(8), Campaigns(9) are not draft-based.
  const isConfigTab = activeTab >= 1 && activeTab <= 7;
  const isDirty =
    draft && config ? JSON.stringify(draft) !== JSON.stringify(config) : false;
  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  const handleRunAiNow = useCallback(async () => {
    if (!tenantId || runningAi) return;
    setRunningAi(true);
    try {
      const { data, error } = await supabase.functions.invoke("loyalty-ai", {
        body: { tenant_id: tenantId }
      });
      if (error) throw error;
      const r = data?.results?.[0] || {};
      const churnMsg = r.churn ? `Churn: ${r.churn.scored||0} scored, ${r.churn.rescued||0} rescued` : "";
      const bdayMsg = r.birthday ? `Birthdays: ${r.birthday.awarded||0}` : "";
      const stockMsg = r.stock_boost ? `Stock boosts: ${r.stock_boost.suggestions||0}` : "";
      showToast(`AI Engine ran \u2014 ${[churnMsg,bdayMsg,stockMsg].filter(Boolean).join(" \u00b7 ")}`);
      await loadAiLog(tenantId);
    } catch (err) {
      showToast("AI run failed: " + err.message, "error");
    } finally {
      setRunningAi(false);
    }
  }, [tenantId, runningAi]); // showToast omitted — stable useCallback

  // ── loadAll: ALL queries tenant-scoped ─────────────────────────────────────
  async function loadAll(tid) {
    if (!tid) return;
    setLoading(true);
    try {
      // CRITICAL FIX: loyalty_config is now tenant-scoped (WP-O v2.0)
      const { data: cfgData, error: cfgErr } = await supabase
        .from("loyalty_config")
        .select("*")
        .eq("tenant_id", tid) // tenant-scoped — was missing in v3.0
        .single();
      if (cfgErr && cfgErr.code !== "PGRST116") throw cfgErr;
      const cfg = { ...DEFAULT_CONFIG, ...(cfgData || {}) };
      setConfig(cfg);
      setDraft({ ...cfg });

      // loyalty_transactions — tenant-scoped
      const { data: txData } = await supabase
        .from("loyalty_transactions")
        .select("points,transaction_type,created_at")
        .eq("tenant_id", tid);
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

      // qr_codes — scoped via inventory_items join (LL-056: scan_logs has no tenant_id — do NOT use scan_logs here)
      const { data: qrData } = await supabase
        .from("qr_codes")
        .select("is_active,claimed,expires_at,inventory_items!inner(tenant_id)")
        .eq("inventory_items.tenant_id", tid);
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

      // referral_codes — tenant-scoped (now has tenant_id column)
      const { data: refData } = await supabase
        .from("referral_codes")
        .select("code,uses_count,owner_id")
        .eq("tenant_id", tid) // tenant-scoped — was missing in v3.0
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

      // At-risk customers: Gold+ who haven't purchased in threshold days
      // Query user_profiles for this tenant's customers at Gold/Platinum/Harvest Club tier
      const { data: atRiskData } = await supabase
        .from("user_profiles")
        .select("id,full_name,loyalty_tier,last_purchase_at")
        .eq("tenant_id", tid)
        .in("loyalty_tier", ["Gold", "Platinum", "Harvest Club"]);
      if (atRiskData) {
        const threshold = cfg.ai_churn_rescue_threshold_days || 21;
        const thresholdDate = new Date(
          Date.now() - threshold * 24 * 3600 * 1000,
        );
        const atRisk = atRiskData
          .filter(
            (c) =>
              c.last_purchase_at &&
              new Date(c.last_purchase_at) < thresholdDate,
          )
          .map((c) => ({
            ...c,
            days_since: Math.floor(
              (Date.now() - new Date(c.last_purchase_at)) / (24 * 3600 * 1000),
            ),
          }))
          .sort((a, b) => b.days_since - a.days_since)
          .slice(0, 10);
        setAtRiskCustomers(atRisk);
      }
    } catch (err) {
      console.error("HQLoyalty loadAll error:", err);
      setDraft({ ...DEFAULT_CONFIG });
      showToast("Could not load config — using defaults", "error");
    } finally {
      setLoading(false);
    }
  }

  // Load AI log separately (can be slow)
  async function loadAiLog(tid) {
    if (!tid) return;
    setLoadingAiLog(true);
    try {
      const { data } = await supabase
        .from("loyalty_ai_log")
        .select("*")
        .eq("tenant_id", tid)
        .order("created_at", { ascending: false })
        .limit(20);
      setAiLog(data || []);
    } catch (err) {
      console.error("HQLoyalty loadAiLog error:", err);
    } finally {
      setLoadingAiLog(false);
    }
  }

  // Mount: wait for tenantId before loading
  useEffect(() => {
    if (tenantId) {
      loadAll(tenantId);
      loadAiLog(tenantId);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function recalculateAllTiers() {
    try {
      const { error } = await supabase.rpc("recalculate_all_tiers");
      if (error) console.error("Tier recalculation failed:", error.message);
    } catch (err) {
      console.error("Tier recalculation exception:", err);
    }
  }

  async function handleApplySchema(schema) {
    if (!tenantId) return;
    setApplyingSchema(true);
    try {
      const schemaValues = { ...schema.values, active_schema: schema.id };
      const { error } = await supabase
        .from("loyalty_config")
        .update(schemaValues)
        .eq("tenant_id", tenantId); // tenant-scoped update
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
    if (!tenantId) return;
    setSaving(true);
    try {
      // Exclude non-updatable fields. NEVER include tenant_id in SET clause.
      const { id, updated_by, tenant_id: _tid, ...fields } = draft;
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
        .eq("tenant_id", tenantId); // tenant-scoped update
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
        <div style={{ fontFamily: T.font, fontSize: 14, color: T.ink500 }}>
          Loading loyalty configuration...
        </div>
      </div>
    );
  }

  const schemaBadge = {
    conservative: { bg: T.infoLight, color: T.info, label: "Conservative" },
    standard: { bg: T.accentLight, color: T.accent, label: "Standard" },
    aggressive: { bg: T.bg, color: T.ink700, label: "Aggressive" },
    custom: { bg: T.warningLight, color: T.warning, label: "Custom" },
  };
  const activeBadge =
    schemaBadge[config?.active_schema] || schemaBadge.standard;

  return (
    <div
      style={{
        fontFamily: T.font,
        background: T.surface,
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
          borderBottom: `1px solid ${T.border}`,
          background: T.surface,
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
                  fontFamily: T.font,
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
                    borderRadius: T.radius.sm,
                    padding: "2px 10px",
                    fontFamily: T.font,
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
                    background: T.warningLight,
                    color: T.warning,
                    border: `1px solid ${T.warningBd}`,
                    borderRadius: T.radius.sm,
                    padding: "2px 10px",
                    fontFamily: T.font,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Unsaved changes
                </span>
              )}
              {tenantName && (
                <span
                  style={{
                    background: T.bg,
                    color: T.ink500,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius.sm,
                    padding: "2px 10px",
                    fontFamily: T.font,
                    fontSize: 11,
                  }}
                >
                  {tenantName}
                </span>
              )}
            </div>
            <p
              style={{
                fontFamily: T.font,
                fontSize: 13,
                color: T.ink500,
                margin: "4px 0 0",
              }}
            >
              All changes update live across the entire platform — ScanResult,
              CheckoutPage, Loyalty, Redeem.
            </p>
          </div>
          {isConfigTab && (
            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              style={{
                padding: "9px 22px",
                background: isDirty ? T.accent : T.border,
                color: isDirty ? "#fff" : T.ink500,
                border: "none",
                borderRadius: T.radius.md,
                fontFamily: T.font,
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

        {/* Sub-tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            flexWrap: "nowrap",
            overflowX: "auto",
          }}
        >
          {SUB_TABS.map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(i)}
              style={{
                padding: "10px 14px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === i
                    ? `2px solid ${T.accent}`
                    : "2px solid transparent",
                fontFamily: T.font,
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

      {/* ── Tab content ── */}
      <div style={{ padding: "24px 28px" }}>
        {activeTab === 0 && (
          <TabSchema
            config={config}
            onApplySchema={handleApplySchema}
            applyingSchema={applyingSchema}
          />
        )}
        {activeTab === 1 && <TabEarning draft={draft} setDraft={setDraft} />}
        {activeTab === 2 && <TabCategories draft={draft} setDraft={setDraft} />}
        {activeTab === 3 && (
          <TabTiers
            draft={draft}
            setDraft={setDraft}
            atRiskCustomers={atRiskCustomers}
          />
        )}
        {activeTab === 4 && (
          <TabEconomics
            draft={draft}
            setDraft={setDraft}
            liveStats={liveStats}
          />
        )}
        {activeTab === 5 && (
          <TabReferrals
            draft={draft}
            setDraft={setDraft}
            referralLeaderboard={referralLB}
            tenantName={tenantName}
          />
        )}
        {activeTab === 6 && (
          <TabQRSecurity draft={draft} setDraft={setDraft} qrStats={qrStats} />
        )}
        {activeTab === 7 && <TabSimulator draft={draft} />}
        {activeTab === 8 && (
          <TabAIEngine
            draft={draft}
            setDraft={setDraft}
            aiLog={aiLog}
            loadingAiLog={loadingAiLog}
            tenantName={tenantName}
            onRunNow={handleRunAiNow}
            runningAi={runningAi}
          />
        )}
        {activeTab === 9 && (
          <TabCampaigns showToast={showToast} tenantId={tenantId} />
        )}
      </div>

      {/* Sticky save bar — only for config tabs (1–7) */}
      {isDirty && isConfigTab && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            background: T.surface,
            borderTop: `1px solid ${T.border}`,
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
              fontFamily: T.font,
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
                border: `1px solid ${T.border}`,
                borderRadius: T.radius.md,
                fontFamily: T.font,
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
                borderRadius: T.radius.md,
                fontFamily: T.font,
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
