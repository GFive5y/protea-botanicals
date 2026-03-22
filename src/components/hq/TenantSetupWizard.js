// src/components/hq/TenantSetupWizard.js v1.0 — WP-BIB Session 7
// Five-step Business in a Box setup wizard
// Replaces AddTenantModal in HQTenants.js
// Steps: 1=Identity · 2=Industry · 3=Tier+Flags · 4=Catalogue · 5=Admin+Create

import React, { useState } from "react";
import { supabase } from "../../services/supabaseClient";
import { INDUSTRY_PROFILES } from "../../constants/industryProfiles";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TIERS = {
  entry: {
    label: "Entry",
    bg: T.ink075,
    color: T.ink500,
    price: "R499/mo",
    desc: "Shop + loyalty + QR",
  },
  pro: {
    label: "Pro",
    bg: T.infoBg,
    color: T.info,
    price: "R1,499/mo",
    desc: "+ Admin portal + AI basic",
  },
  enterprise: {
    label: "Enterprise",
    bg: T.accentLit,
    color: T.accent,
    price: "R4,999/mo",
    desc: "+ HQ + full AI + medical",
  },
};

const TIER_PRESETS = {
  entry: {
    feature_hq: false,
    feature_ai_basic: false,
    feature_ai_full: false,
    feature_medical: false,
    feature_white_label: false,
    feature_wholesale: false,
    feature_hr: false,
    ai_queries_daily: 0,
    staff_seats: 1,
  },
  pro: {
    feature_hq: false,
    feature_ai_basic: true,
    feature_ai_full: false,
    feature_medical: false,
    feature_white_label: false,
    feature_wholesale: false,
    feature_hr: false,
    ai_queries_daily: 50,
    staff_seats: 3,
  },
  enterprise: {
    feature_hq: true,
    feature_ai_basic: true,
    feature_ai_full: true,
    feature_medical: true,
    feature_white_label: true,
    feature_wholesale: true,
    feature_hr: true,
    ai_queries_daily: 500,
    staff_seats: 999,
  },
};

const FLAG_DEFS = [
  {
    key: "feature_hq",
    label: "HQ Portal",
    desc: "Full HQ Command Centre — production, procurement, P&L, fraud",
  },
  {
    key: "feature_ai_basic",
    label: "AI Basic",
    desc: "AI Assistant with Haiku model, 50 queries/day",
  },
  {
    key: "feature_ai_full",
    label: "AI Full",
    desc: "Full Claude AI + document digestion (COA, invoices, POs)",
  },
  {
    key: "feature_medical",
    label: "Medical Module",
    desc: "Section 21, Schedule numbers, patient dispensing records",
  },
  {
    key: "feature_white_label",
    label: "White Label",
    desc: "Custom branding, subdomain routing",
  },
  {
    key: "feature_wholesale",
    label: "Wholesale",
    desc: "Wholesale partner management, trade pricing",
  },
  {
    key: "feature_hr",
    label: "HR Module",
    desc: "Staff, leave, timesheets, payroll, contracts",
  },
];

// Profile-specific feature flag overrides on top of tier preset
const PROFILE_FLAG_OVERRIDES = {
  cannabis_dispensary: { feature_medical: true },
  general_retail: { feature_ai_full: false },
  food_beverage: { feature_medical: false },
};

// Profile-specific live preview text
const PROFILE_PREVIEW = {
  cannabis_retail: {
    on: [
      "Full QR + loyalty engine",
      "Vape/flower/edibles stock management",
      "Terpene + distillate inventory",
      "Production batches + COA tracking",
      "AI pre-loaded with cannabis compliance",
    ],
    off: ["No medical module", "No patient records", "No Section 21 permits"],
  },
  cannabis_dispensary: {
    on: [
      "Medical module enabled",
      "Section 21 + Schedule numbers",
      "Patient registration + dispensing records",
      "SAHPRA compliance reporting",
      "Full QR + loyalty engine",
    ],
    off: ["Enterprise tier required"],
  },
  general_retail: {
    on: [
      "Stock tables adapted for retail products",
      "Supplier invoice auto-ingestion",
      "AI pre-loaded with retail management",
      "QR links to product detail page",
    ],
    off: [
      "No cannabis fields",
      "No medical module",
      "No Section 21 / Schedule numbers",
    ],
  },
  food_beverage: {
    on: [
      "Ingredients + packaging stock language",
      "Expiry dates mandatory on perishables",
      "Allergen flags on all ingredient records",
      "Recipe-based production management",
      "AI pre-loaded with FSCA + food safety knowledge",
      "QR codes show allergens + ingredients list",
    ],
    off: [
      "No cannabis fields",
      "No medical module",
      "No Section 21 / Schedule numbers",
    ],
  },
  mixed_retail: {
    on: [
      "Multiple product categories managed in context",
      "Cannabis + lifestyle + food + accessories",
      "Profile adapts per product category",
      "Full QR + loyalty engine",
    ],
    off: ["Medical module requires Enterprise tier"],
  },
};

// ─── Shared styles ────────────────────────────────────────────────────────────
const sInput = {
  padding: "9px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: 4,
  fontSize: 13,
  fontFamily: T.font,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  color: T.ink700,
};
const sLabel = {
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: 4,
  fontFamily: T.font,
  fontWeight: 700,
  display: "block",
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        cursor: disabled ? "default" : "pointer",
        background: on ? T.accentMid : T.ink300,
        transition: "background 0.2s",
        position: "relative",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function WizardProgress({ step, total }) {
  const steps = ["Identity", "Industry", "Features", "Catalogue", "Create"];
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 28 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <div
            key={label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
              {i > 0 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: done ? T.accentMid : T.ink150,
                    transition: "background 0.3s",
                  }}
                />
              )}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: T.font,
                  fontSize: 11,
                  fontWeight: 700,
                  background: done ? T.accentMid : active ? T.accent : T.ink150,
                  color: done || active ? "#fff" : T.ink400,
                  transition: "all 0.3s",
                }}
              >
                {done ? "✓" : idx}
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: done ? T.accentMid : T.ink150,
                    transition: "background 0.3s",
                  }}
                />
              )}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: active ? 700 : 400,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: active ? T.accent : done ? T.accentMid : T.ink400,
                fontFamily: T.font,
                textAlign: "center",
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
export default function TenantSetupWizard({ onClose, onSaved, showToast }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  // Step 1 — Identity
  const [identity, setIdentity] = useState({
    name: "",
    slug: "",
    trading_name: "",
    reg_number: "",
    vat_number: "",
    email: "",
    phone: "",
    city: "",
    province: "",
  });

  // Step 2 — Industry
  const [industryProfile, setIndustryProfile] = useState(null);

  // Step 3 — Tier + Flags
  const [tier, setTier] = useState("pro");
  const [flags, setFlags] = useState({ ...TIER_PRESETS.pro });

  // Step 4 — Catalogue
  const [seedCatalogue, setSeedCatalogue] = useState(false);

  // Step 5 — Admin user
  const [admin, setAdmin] = useState({ email: "", password: "", name: "" });

  const slugify = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  // When tier changes, update flags to tier preset + profile overrides
  const applyTierPreset = (newTier, profile) => {
    const preset = { ...TIER_PRESETS[newTier] };
    const overrides = PROFILE_FLAG_OVERRIDES[profile] || {};
    setFlags({ ...preset, ...overrides });
  };

  const handleSelectProfile = (profileKey) => {
    setIndustryProfile(profileKey);
    applyTierPreset(tier, profileKey);
    // Auto-upgrade to enterprise for dispensary
    if (profileKey === "cannabis_dispensary" && tier !== "enterprise") {
      setTier("enterprise");
      applyTierPreset("enterprise", profileKey);
    }
  };

  const handleTierChange = (newTier) => {
    setTier(newTier);
    applyTierPreset(newTier, industryProfile);
  };

  const handleCreate = async () => {
    if (!identity.name || !admin.email || !admin.password) {
      showToast(
        "Business name, admin email and password are required.",
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      // 1. Insert tenant
      const { data: tenant, error: tErr } = await supabase
        .from("tenants")
        .insert({
          name: identity.name.trim(),
          slug: identity.slug || slugify(identity.name),
          type: "retail",
          tier,
          is_active: true,
          industry_profile: industryProfile || "cannabis_retail",
          location_city: identity.city || null,
          location_province: identity.province || null,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      // 2. Insert tenant_config with flags
      const { error: cfgErr } = await supabase
        .from("tenant_config")
        .insert({ tenant_id: tenant.id, tier, ...flags });
      if (cfgErr) throw cfgErr;

      // 3. Create admin user via Edge Function
      let authNote = "";
      try {
        const { data: fnData, error: fnErr } = await supabase.functions.invoke(
          "create-admin-user",
          {
            body: {
              email: admin.email,
              password: admin.password,
              tenantId: tenant.id,
              role: "admin",
            },
          },
        );
        if (fnErr) throw fnErr;
        authNote = fnData?.message || "Admin user created.";
      } catch (fnErr) {
        authNote = `⚠ Auth user not created automatically: ${fnErr.message}. Create manually in Supabase Auth, then INSERT into user_profiles (tenant_id=${tenant.id}, role='admin').`;
      }

      setResult({ tenant, authNote });
      setStep(6); // done screen
      onSaved();
    } catch (err) {
      showToast("Create failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const preview = industryProfile ? PROFILE_PREVIEW[industryProfile] : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: T.font,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          width: "100%",
          maxWidth: step === 2 ? 760 : 600,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          transition: "max-width 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.accentMid,
                marginBottom: 4,
              }}
            >
              Business in a Box
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: T.accent }}>
              {step === 6 ? "✓ Tenant Created" : "New Tenant Setup"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: T.ink400,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 28px 28px" }}>
          {step < 6 && <WizardProgress step={step} total={5} />}

          {/* ── STEP 1: Identity ──────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink700,
                  marginBottom: 16,
                }}
              >
                Business Identity
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <label style={sLabel}>Business Name *</label>
                  <input
                    style={sInput}
                    placeholder="e.g. Cape Town Dispensary"
                    value={identity.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setIdentity((p) => ({
                        ...p,
                        name: v,
                        slug: p.slug || slugify(v),
                      }));
                    }}
                  />
                </div>
                <div>
                  <label style={sLabel}>Trading Name</label>
                  <input
                    style={sInput}
                    placeholder="Optional — if different from above"
                    value={identity.trading_name}
                    onChange={(e) =>
                      setIdentity((p) => ({
                        ...p,
                        trading_name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={sLabel}>URL Slug</label>
                  <input
                    style={sInput}
                    placeholder="auto-generated from name"
                    value={identity.slug}
                    onChange={(e) =>
                      setIdentity((p) => ({
                        ...p,
                        slug: slugify(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label style={sLabel}>Registration Number</label>
                  <input
                    style={sInput}
                    placeholder="Optional"
                    value={identity.reg_number}
                    onChange={(e) =>
                      setIdentity((p) => ({ ...p, reg_number: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={sLabel}>VAT Number</label>
                  <input
                    style={sInput}
                    placeholder="Optional"
                    value={identity.vat_number}
                    onChange={(e) =>
                      setIdentity((p) => ({ ...p, vat_number: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={sLabel}>Business Phone</label>
                  <input
                    style={sInput}
                    placeholder="e.g. +27 21 555 0000"
                    value={identity.phone}
                    onChange={(e) =>
                      setIdentity((p) => ({ ...p, phone: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={sLabel}>City</label>
                  <input
                    style={sInput}
                    placeholder="e.g. Cape Town"
                    value={identity.city}
                    onChange={(e) =>
                      setIdentity((p) => ({ ...p, city: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={sLabel}>Province</label>
                  <select
                    style={{ ...sInput, cursor: "pointer" }}
                    value={identity.province}
                    onChange={(e) =>
                      setIdentity((p) => ({ ...p, province: e.target.value }))
                    }
                  >
                    <option value="">— Select —</option>
                    {[
                      "Western Cape",
                      "Gauteng",
                      "KwaZulu-Natal",
                      "Eastern Cape",
                      "Free State",
                      "Limpopo",
                      "Mpumalanga",
                      "North West",
                      "Northern Cape",
                    ].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={onClose}
                  style={{
                    padding: "9px 20px",
                    background: "transparent",
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: T.font,
                    color: T.ink500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!identity.name.trim()) {
                      showToast("Business name is required.", "error");
                      return;
                    }
                    setStep(2);
                  }}
                  style={{
                    padding: "9px 24px",
                    background: T.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: T.font,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Industry ─────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink700,
                  marginBottom: 6,
                }}
              >
                What type of business is {identity.name || "this tenant"}?
              </div>
              <div style={{ fontSize: 12, color: T.ink400, marginBottom: 20 }}>
                This determines how the platform looks and works for them.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {Object.entries(INDUSTRY_PROFILES).map(([key, profile]) => {
                  const selected = industryProfile === key;
                  const isEnterprise = key === "cannabis_dispensary";
                  return (
                    <div
                      key={key}
                      onClick={() => handleSelectProfile(key)}
                      style={{
                        padding: "16px 18px",
                        borderRadius: 8,
                        cursor: "pointer",
                        border: `2px solid ${selected ? T.accentMid : T.ink150}`,
                        background: selected ? T.accentLit : "#fff",
                        transition: "all 0.15s",
                        position: "relative",
                      }}
                    >
                      {isEnterprise && (
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            fontSize: 8,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: T.accentLit,
                            color: T.accentMid,
                            border: `1px solid ${T.accentBd}`,
                          }}
                        >
                          Enterprise
                        </div>
                      )}
                      <div style={{ fontSize: 20, marginBottom: 6 }}>
                        {profile.icon}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: selected ? T.accent : T.ink900,
                          marginBottom: 4,
                        }}
                      >
                        {profile.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: T.ink500,
                          lineHeight: 1.5,
                        }}
                      >
                        {profile.description || profile.desc || ""}
                      </div>
                      {selected && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            color: T.accentMid,
                            letterSpacing: "0.06em",
                          }}
                        >
                          ✓ SELECTED
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live preview */}
              {preview && (
                <div
                  style={{
                    padding: "14px 16px",
                    background: T.ink050,
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 6,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: T.accentMid,
                      marginBottom: 10,
                    }}
                  >
                    Platform configured for:{" "}
                    {INDUSTRY_PROFILES[industryProfile]?.label}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      {preview.on.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 11,
                            color: T.success,
                            marginBottom: 3,
                          }}
                        >
                          ✓ {item}
                        </div>
                      ))}
                    </div>
                    <div>
                      {preview.off.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 11,
                            color: T.ink400,
                            marginBottom: 3,
                          }}
                        >
                          ✗ {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: "9px 20px",
                    background: "transparent",
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: T.font,
                    color: T.ink500,
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!industryProfile) {
                      showToast("Select an industry profile.", "error");
                      return;
                    }
                    setStep(3);
                  }}
                  style={{
                    padding: "9px 24px",
                    background: T.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: T.font,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Tier + Feature Flags ─────────────────────────────────── */}
          {step === 3 && (
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink700,
                  marginBottom: 16,
                }}
              >
                Subscription Tier & Features
              </div>

              {/* Tier selector */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {Object.entries(TIERS).map(([key, t]) => {
                  const selected = tier === key;
                  return (
                    <div
                      key={key}
                      onClick={() => handleTierChange(key)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 6,
                        cursor: "pointer",
                        border: `2px solid ${selected ? T.accentMid : T.ink150}`,
                        background: selected ? T.accentLit : "#fff",
                        textAlign: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: selected ? T.accent : T.ink700,
                          marginBottom: 2,
                        }}
                      >
                        {t.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: selected ? T.accentMid : T.ink900,
                          marginBottom: 4,
                        }}
                      >
                        {t.price}
                      </div>
                      <div style={{ fontSize: 10, color: T.ink500 }}>
                        {t.desc}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Feature flag toggles */}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: 10,
                }}
              >
                Feature Flags — adjust as needed
              </div>
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                {FLAG_DEFS.map(({ key, label, desc }) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: flags[key] ? T.accentLit : T.ink050,
                      border: `1px solid ${flags[key] ? T.accentBd : T.ink150}`,
                      borderRadius: 6,
                    }}
                  >
                    <Toggle
                      on={!!flags[key]}
                      onChange={(v) => setFlags((p) => ({ ...p, [key]: v }))}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: T.ink700,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{ fontSize: 11, color: T.ink400, marginTop: 1 }}
                      >
                        {desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <button
                  onClick={() => setStep(2)}
                  style={{
                    padding: "9px 20px",
                    background: "transparent",
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: T.font,
                    color: T.ink500,
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  style={{
                    padding: "9px 24px",
                    background: T.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: T.font,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Starter Catalogue ─────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink700,
                  marginBottom: 6,
                }}
              >
                Starter Catalogue
              </div>
              <div style={{ fontSize: 12, color: T.ink400, marginBottom: 20 }}>
                Optionally seed a starter catalogue appropriate for{" "}
                {INDUSTRY_PROFILES[industryProfile]?.label || "this industry"}.
              </div>

              <div
                onClick={() => setSeedCatalogue(!seedCatalogue)}
                style={{
                  padding: "20px 24px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `2px solid ${seedCatalogue ? T.accentMid : T.ink150}`,
                  background: seedCatalogue ? T.accentLit : "#fff",
                  marginBottom: 16,
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      border: `2px solid ${seedCatalogue ? T.accentMid : T.ink300}`,
                      background: seedCatalogue ? T.accentMid : "#fff",
                      flexShrink: 0,
                      marginTop: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {seedCatalogue && (
                      <span
                        style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: seedCatalogue ? T.accent : T.ink700,
                        marginBottom: 6,
                      }}
                    >
                      Yes, seed a starter catalogue for{" "}
                      {INDUSTRY_PROFILES[industryProfile]?.label}
                    </div>
                    <div
                      style={{ fontSize: 11, color: T.ink500, lineHeight: 1.6 }}
                    >
                      AI will create starter stock categories and example items
                      appropriate for this business type. You can delete or edit
                      anything after setup.
                    </div>
                    {seedCatalogue && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "10px 12px",
                          background: T.warningBg,
                          border: `1px solid ${T.warningBd}`,
                          borderRadius: 6,
                          fontSize: 11,
                          color: T.warning,
                        }}
                      >
                        ⚡ Starter catalogue seeding is available from WP-BIB
                        Session 10 onwards. The tenant will be created now —
                        catalogue can be seeded manually or via AI Assist.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSeedCatalogue(false)}
                style={{
                  padding: "16px 24px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `2px solid ${!seedCatalogue ? T.accentMid : T.ink150}`,
                  background: !seedCatalogue ? T.accentLit : "#fff",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      border: `2px solid ${!seedCatalogue ? T.accentMid : T.ink300}`,
                      background: !seedCatalogue ? T.accentMid : "#fff",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {!seedCatalogue && (
                      <span
                        style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}
                      >
                        ✓
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: !seedCatalogue ? T.accent : T.ink700,
                    }}
                  >
                    No — I'll set up the catalogue manually
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={() => setStep(3)}
                  style={{
                    padding: "9px 20px",
                    background: "transparent",
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: T.font,
                    color: T.ink500,
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  style={{
                    padding: "9px 24px",
                    background: T.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: T.font,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Admin User + Create ───────────────────────────────────── */}
          {step === 5 && (
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink700,
                  marginBottom: 16,
                }}
              >
                Create Admin User
              </div>

              {/* Summary */}
              <div
                style={{
                  padding: "14px 16px",
                  background: T.ink050,
                  border: `1px solid ${T.ink150}`,
                  borderRadius: 6,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: T.ink400,
                    marginBottom: 8,
                  }}
                >
                  Ready to create
                </div>
                {[
                  ["Business", identity.name],
                  [
                    "Industry",
                    INDUSTRY_PROFILES[industryProfile]?.label ||
                      industryProfile,
                  ],
                  ["Tier", TIERS[tier]?.label + " — " + TIERS[tier]?.price],
                  [
                    "Location",
                    [identity.city, identity.province]
                      .filter(Boolean)
                      .join(", ") || "—",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      borderBottom: `1px solid ${T.ink150}`,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: T.ink400 }}>{label}</span>
                    <span style={{ fontWeight: 600, color: T.ink700 }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={sLabel}>Admin Full Name</label>
                  <input
                    style={sInput}
                    placeholder="e.g. Jane Smith"
                    value={admin.name}
                    onChange={(e) =>
                      setAdmin((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={sLabel}>Admin Email *</label>
                  <input
                    style={sInput}
                    type="email"
                    placeholder="admin@business.com"
                    value={admin.email}
                    onChange={(e) =>
                      setAdmin((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={sLabel}>Temporary Password *</label>
                  <input
                    style={sInput}
                    type="password"
                    placeholder="Min 8 characters"
                    value={admin.password}
                    onChange={(e) =>
                      setAdmin((p) => ({ ...p, password: e.target.value }))
                    }
                  />
                  <div
                    style={{
                      fontSize: 10,
                      color: T.ink400,
                      marginTop: 4,
                      fontFamily: T.font,
                    }}
                  >
                    Admin will be prompted to change this on first login.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <button
                  onClick={() => setStep(4)}
                  style={{
                    padding: "9px 20px",
                    background: "transparent",
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: T.font,
                    color: T.ink500,
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  style={{
                    padding: "11px 28px",
                    background: saving ? T.ink300 : T.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: T.font,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {saving ? "Creating…" : "✓ Create Tenant"}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 6: Done ──────────────────────────────────────────────────── */}
          {step === 6 && result && (
            <div>
              <div
                style={{
                  padding: "20px 20px",
                  background: T.successBg,
                  border: `1px solid ${T.successBd}`,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: T.success,
                    marginBottom: 10,
                  }}
                >
                  🎉 {result.tenant.name} is live
                </div>
                {[
                  ["Tenant ID", result.tenant.id],
                  [
                    "Industry",
                    INDUSTRY_PROFILES[result.tenant.industry_profile]?.label ||
                      result.tenant.industry_profile,
                  ],
                  ["Tier", result.tenant.tier],
                  ["Slug", result.tenant.slug],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      borderBottom: `1px solid ${T.successBd}`,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: T.success }}>{label}</span>
                    <code
                      style={{
                        fontSize: 11,
                        fontFamily: T.font,
                        background: "#fff",
                        padding: "1px 6px",
                        borderRadius: 3,
                        color: T.ink700,
                      }}
                    >
                      {value}
                    </code>
                  </div>
                ))}
              </div>

              {result.authNote && (
                <div
                  style={{
                    padding: "14px 16px",
                    background: T.warningBg,
                    border: `1px solid ${T.warningBd}`,
                    borderRadius: 6,
                    marginBottom: 16,
                    fontSize: 12,
                    color: T.warning,
                    lineHeight: 1.7,
                  }}
                >
                  {result.authNote}
                </div>
              )}

              <div
                style={{
                  padding: "12px 16px",
                  background: T.infoBg,
                  border: `1px solid ${T.infoBd}`,
                  borderRadius: 6,
                  marginBottom: 20,
                  fontSize: 11,
                  color: T.info,
                  lineHeight: 1.6,
                }}
              >
                <strong>Next steps:</strong> Have the admin log in to verify
                access. Stock, production and AI features are available
                immediately based on the feature flags set.
              </div>

              <button
                onClick={onClose}
                style={{
                  padding: "10px 24px",
                  background: T.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: T.font,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
