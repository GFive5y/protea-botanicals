// src/components/hq/HQTenants.js
// WP-GEN Session 5: Tenant management UI
// WP-IND Session 1: industry_profile selector added
// Tables: tenants, tenant_config, tenant_usage_log
// Edge Function: create-admin-user (must be deployed separately)

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { INDUSTRY_PROFILES } from "../../constants/industryProfiles";
import TenantSetupWizard from "./TenantSetupWizard";

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
};

const sCard = {
  background: "#fff",
  border: `1px solid ${T.ink150}`,
  borderRadius: "6px",
  padding: "20px",
  boxShadow: T.shadow,
};
const sBtn = (v = "primary") => ({
  padding: "8px 16px",
  background:
    v === "primary"
      ? T.accent
      : v === "danger"
        ? T.danger
        : v === "amber"
          ? T.warning
          : "transparent",
  color: ["primary", "danger", "amber"].includes(v) ? "#fff" : T.accentMid,
  border: ["primary", "danger", "amber"].includes(v)
    ? "none"
    : `1px solid ${T.accentBd}`,
  borderRadius: "4px",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.font,
  transition: "all 0.15s",
});
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: T.font,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };
const sLabel = {
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: "6px",
  fontFamily: T.font,
  fontWeight: 700,
};

// ── Tier definitions ──────────────────────────────────────────────────────────
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

// ── Feature flag definitions (label + description for each flag) ──────────────
const FLAG_DEFS = [
  {
    key: "feature_hq",
    label: "HQ Portal",
    desc: "Full HQ Command Centre access — production, procurement, P&L, fraud",
  },
  {
    key: "feature_ai_basic",
    label: "AI Basic",
    desc: "AI Assistant with Haiku model, 50 queries/day limit",
  },
  {
    key: "feature_ai_full",
    label: "AI Full",
    desc: "Full Claude AI, document digestion (COA, invoices, POs)",
  },
  {
    key: "feature_medical",
    label: "Medical Module",
    desc: "Section 21 permits, Schedule numbers, patient dispensing records",
  },
  {
    key: "feature_white_label",
    label: "White Label",
    desc: "Custom branding, subdomain routing (clientname.proteaplatform.co.za)",
  },
  {
    key: "feature_wholesale",
    label: "Wholesale",
    desc: "Wholesale partner management, trade pricing, bulk order portal",
  },
  {
    key: "feature_hr",
    label: "HR Module",
    desc: "Staff directory, leave, timesheets, payroll, contracts",
  },
];

// ── Tier presets — which flags each tier gets by default ─────────────────────
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

function TierBadge({ tier }) {
  const t = TIERS[tier] || {
    label: tier || "—",
    bg: T.ink075,
    color: T.ink400,
  };
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "2px 8px",
        borderRadius: "3px",
        background: t.bg,
        color: t.color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: T.font,
      }}
    >
      {t.label}
    </span>
  );
}

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

// ── Add New Tenant modal ──────────────────────────────────────────────────────
// Superseded by TenantSetupWizard (WP-BIB Session 7) — kept as reference for WP-TENANTS.
// eslint-disable-next-line no-unused-vars
function AddTenantModal({ onClose, onSaved, showToast }) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "retail",
    tier: "pro",
    admin_email: "",
    admin_password: "",
    city: "",
    province: "",
    industry_profile: "cannabis_retail",
  });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1); // 1=details, 2=confirm, 3=done
  const [result, setResult] = useState(null);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const slugify = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleCreate = async () => {
    if (!form.name || !form.admin_email || !form.admin_password) {
      showToast("Name, admin email and password are required.", "error");
      return;
    }
    setSaving(true);
    try {
      // Step 1: INSERT tenant
      const { data: tenant, error: tErr } = await supabase
        .from("tenants")
        .insert({
          name: form.name,
          slug: form.slug || slugify(form.name),
          type: form.type,
          tier: form.tier,
          is_active: true,
          industry_profile: form.industry_profile || "cannabis_retail",
          location_city: form.city || null,
          location_province: form.province || null,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      // Step 2: INSERT tenant_config with tier preset
      const preset = TIER_PRESETS[form.tier] || TIER_PRESETS.pro;
      const { error: cfgErr } = await supabase
        .from("tenant_config")
        .insert({ tenant_id: tenant.id, tier: form.tier, ...preset });
      if (cfgErr) throw cfgErr;

      // Step 3: Create admin user via Edge Function
      let authNote = "";
      try {
        const { data: fnData, error: fnErr } = await supabase.functions.invoke(
          "create-admin-user",
          {
            body: {
              email: form.admin_email,
              password: form.admin_password,
              tenantId: tenant.id,
              role: "admin",
            },
          },
        );
        if (fnErr) throw fnErr;
        authNote = fnData?.message || "Admin user created.";
      } catch (fnErr) {
        // Edge function may not be deployed yet — note it but don't fail
        authNote = `⚠️ Auth user not created automatically: ${fnErr.message}. Create manually in Supabase Auth, then INSERT into user_profiles (tenant_id=${tenant.id}, role='admin').`;
      }

      setResult({ tenant, authNote });
      setStep(3);
      onSaved();
    } catch (err) {
      showToast("Create failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          ...sCard,
          maxWidth: 560,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              fontFamily: T.font,
              color: T.accent,
            }}
          >
            {step === 3 ? "✓ Tenant Created" : "Add New Tenant"}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: T.ink400,
            }}
          >
            ✕
          </button>
        </div>

        {step === 3 && result ? (
          <div>
            <div
              style={{
                ...sCard,
                border: `1px solid ${T.successBd}`,
                background: T.successBg,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.success,
                  fontFamily: T.font,
                  marginBottom: 8,
                }}
              >
                {result.tenant.name} created successfully
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: T.ink700,
                  fontFamily: T.font,
                  lineHeight: 1.7,
                }}
              >
                Tenant ID:{" "}
                <code
                  style={{
                    fontFamily: T.font,
                    background: T.ink075,
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  {result.tenant.id}
                </code>
              </div>
            </div>
            {result.authNote && (
              <div
                style={{
                  ...sCard,
                  border: `1px solid ${T.warningBd}`,
                  background: T.warningBg,
                  marginBottom: 16,
                  fontSize: 12,
                  fontFamily: T.font,
                  color: T.warning,
                  lineHeight: 1.7,
                }}
              >
                {result.authNote}
              </div>
            )}
            <button onClick={onClose} style={sBtn()}>
              Done
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {/* Business details */}
            <div>
              <div style={{ ...sLabel, marginBottom: 10 }}>
                Business Details
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label style={{ ...sLabel, marginBottom: 4 }}>
                    Business Name *
                  </label>
                  <input
                    style={sInput}
                    placeholder="e.g. Cape Town Dispensary"
                    value={form.name}
                    onChange={(e) => {
                      set("name", e.target.value);
                      if (!form.slug) set("slug", slugify(e.target.value));
                    }}
                  />
                </div>
                <div>
                  <label style={{ ...sLabel, marginBottom: 4 }}>
                    Slug (URL identifier)
                  </label>
                  <input
                    style={sInput}
                    placeholder="auto-generated"
                    value={form.slug}
                    onChange={(e) => set("slug", slugify(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ ...sLabel, marginBottom: 4 }}>
                    Business Type
                  </label>
                  <select
                    style={sSelect}
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                  >
                    {[
                      "retail",
                      "dispensary",
                      "wholesale",
                      "service",
                      "other",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ ...sLabel, marginBottom: 4 }}>Tier</label>
                  <select
                    style={sSelect}
                    value={form.tier}
                    onChange={(e) => set("tier", e.target.value)}
                  >
                    {Object.entries(TIERS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label} — {v.price}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ ...sLabel, marginBottom: 4 }}>
                    Industry Profile
                  </label>
                  <select
                    style={sSelect}
                    value={form.industry_profile}
                    onChange={(e) => set("industry_profile", e.target.value)}
                  >
                    {Object.entries(INDUSTRY_PROFILES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                  <p
                    style={{
                      fontSize: 11,
                      color: T.ink500,
                      fontFamily: T.font,
                      margin: "4px 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {INDUSTRY_PROFILES[form.industry_profile]?.description}
                  </p>
                </div>
                <div>
                  <label style={{ ...sLabel, marginBottom: 4 }}>City</label>
                  <input
                    style={sInput}
                    placeholder="e.g. Cape Town"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ ...sLabel, marginBottom: 4 }}>Province</label>
                  <input
                    style={sInput}
                    placeholder="e.g. Western Cape"
                    value={form.province}
                    onChange={(e) => set("province", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Admin user */}
            <div>
              <div style={{ ...sLabel, marginBottom: 10 }}>
                Admin User Account
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label style={{ ...sLabel, marginBottom: 4 }}>
                    Admin Email *
                  </label>
                  <input
                    style={sInput}
                    type="email"
                    placeholder="admin@client.co.za"
                    value={form.admin_email}
                    onChange={(e) => set("admin_email", e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ ...sLabel, marginBottom: 4 }}>
                    Temporary Password *
                  </label>
                  <input
                    style={sInput}
                    type="password"
                    placeholder="min 8 chars"
                    value={form.admin_password}
                    onChange={(e) => set("admin_password", e.target.value)}
                  />
                </div>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: T.ink500,
                  fontFamily: T.font,
                  margin: "6px 0 0",
                  lineHeight: 1.6,
                }}
              >
                Requires{" "}
                <code
                  style={{
                    background: T.ink075,
                    padding: "1px 4px",
                    borderRadius: 3,
                    fontSize: 11,
                  }}
                >
                  create-admin-user
                </code>{" "}
                Edge Function deployed in Supabase. If not deployed, tenant and
                config rows are still created — create the auth user manually.
              </p>
            </div>

            {/* Tier preview */}
            <div
              style={{
                ...sCard,
                background: T.ink075,
                border: `1px solid ${T.ink150}`,
              }}
            >
              <div style={{ ...sLabel, marginBottom: 8 }}>
                Features included in {TIERS[form.tier]?.label} tier
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FLAG_DEFS.map((f) => {
                  const on = TIER_PRESETS[form.tier]?.[f.key];
                  return (
                    <span
                      key={f.key}
                      style={{
                        fontSize: "10px",
                        padding: "2px 8px",
                        borderRadius: "3px",
                        background: on ? T.successBg : T.dangerBg,
                        color: on ? T.success : T.danger,
                        fontWeight: 600,
                        fontFamily: T.font,
                      }}
                    >
                      {on ? "✓" : "✕"} {f.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleCreate}
                disabled={saving}
                style={{ ...sBtn(), minWidth: 160 }}
              >
                {saving ? "Creating..." : "Create Tenant →"}
              </button>
              <button onClick={onClose} style={sBtn("outline")}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Feature flag editor panel ─────────────────────────────────────────────────
function FlagEditor({ tenantId, config, industryProfile, onSaved, showToast }) {
  const [editing, setEditing] = useState(false);
  const [flags, setFlags] = useState({
    ...config,
    industry_profile: industryProfile,
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setFlags((f) => ({ ...f, industry_profile: industryProfile }));
  }, [industryProfile]);
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenant_config")
        .update({
          feature_hq: flags.feature_hq,
          feature_ai_basic: flags.feature_ai_basic,
          feature_ai_full: flags.feature_ai_full,
          feature_medical: flags.feature_medical,
          feature_white_label: flags.feature_white_label,
          feature_wholesale: flags.feature_wholesale,
          feature_hr: flags.feature_hr,
          ai_queries_daily: parseInt(flags.ai_queries_daily) || 0,
          staff_seats: parseInt(flags.staff_seats) || 1,
          tier: flags.tier,
        })
        .eq("tenant_id", tenantId);
      if (error) throw error;
      // Also update industry_profile on the tenants table
      const { error: tenantErr } = await supabase
        .from("tenants")
        .update({
          industry_profile: flags.industry_profile || "cannabis_retail",
        })
        .eq("id", tenantId);
      if (tenantErr) throw tenantErr;
      // RLS blocks return no error but 0 rows — detect silently
      const { data: tenantCheck } = await supabase
        .from("tenants")
        .select("industry_profile")
        .eq("id", tenantId)
        .single();
      if (
        tenantCheck &&
        tenantCheck.industry_profile !==
          (flags.industry_profile || "cannabis_retail")
      ) {
        console.warn(
          "[FlagEditor] industry_profile UPDATE silently failed — RLS may be blocking. Current value:",
          tenantCheck.industry_profile,
        );
      }
      setEditing(false);
      showToast("Feature flags saved. Refreshing context...");
      onSaved();
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (tier) => {
    const preset = TIER_PRESETS[tier];
    if (preset) setFlags((p) => ({ ...p, tier, ...preset }));
  };

  return (
    <div style={{ marginTop: 12 }}>
      {!editing ? (
        <div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            {FLAG_DEFS.map((f) => (
              <span
                key={f.key}
                title={f.desc}
                style={{
                  fontSize: "9px",
                  padding: "2px 8px",
                  borderRadius: "3px",
                  background: config[f.key] ? T.successBg : T.ink075,
                  color: config[f.key] ? T.success : T.ink400,
                  fontWeight: 600,
                  fontFamily: T.font,
                  cursor: "help",
                  border: `1px solid ${config[f.key] ? T.successBd : T.ink150}`,
                }}
              >
                {config[f.key] ? "✓" : "✕"} {f.label}
              </span>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 11,
              color: T.ink500,
              fontFamily: T.font,
            }}
          >
            <span>
              {config.ai_queries_daily} AI queries/day · {config.staff_seats}{" "}
              staff seats
            </span>
            <button
              onClick={() => setEditing(true)}
              style={{
                ...sBtn("outline"),
                padding: "3px 10px",
                fontSize: "9px",
                marginLeft: 6,
              }}
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            ...sCard,
            background: T.accentLit,
            border: `1px solid ${T.accentBd}`,
            marginTop: 8,
          }}
        >
          <div style={{ ...sLabel, marginBottom: 12 }}>
            Edit Feature Flags & Limits
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...sLabel, marginBottom: 4 }}>
              Industry Profile (HQ only)
            </label>
            <select
              style={sSelect}
              value={flags.industry_profile || "cannabis_retail"}
              onChange={(e) =>
                setFlags((p) => ({ ...p, industry_profile: e.target.value }))
              }
            >
              {Object.entries(INDUSTRY_PROFILES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label} — {v.description}
                </option>
              ))}
            </select>
          </div>

          {/* Tier quick-set */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 11,
                color: T.ink500,
                fontFamily: T.font,
                marginBottom: 6,
              }}
            >
              Quick-set by tier:
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(TIERS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => applyPreset(k)}
                  style={{
                    ...sBtn(flags.tier === k ? "primary" : "outline"),
                    padding: "4px 12px",
                    fontSize: "9px",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Individual flags */}
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            {FLAG_DEFS.map((f) => (
              <div
                key={f.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: T.font,
                      color: T.ink900,
                    }}
                  >
                    {f.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: T.ink500,
                      fontFamily: T.font,
                      lineHeight: 1.5,
                    }}
                  >
                    {f.desc}
                  </div>
                </div>
                <Toggle
                  on={!!flags[f.key]}
                  onChange={(v) => setFlags((p) => ({ ...p, [f.key]: v }))}
                />
              </div>
            ))}
          </div>

          {/* Numeric limits */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={{ ...sLabel, marginBottom: 4 }}>
                AI Queries / Day
              </label>
              <input
                style={sInput}
                type="number"
                min="0"
                value={flags.ai_queries_daily || 0}
                onChange={(e) =>
                  setFlags((p) => ({ ...p, ai_queries_daily: e.target.value }))
                }
              />
            </div>
            <div>
              <label style={{ ...sLabel, marginBottom: 4 }}>Staff Seats</label>
              <input
                style={sInput}
                type="number"
                min="1"
                value={flags.staff_seats || 1}
                onChange={(e) =>
                  setFlags((p) => ({ ...p, staff_seats: e.target.value }))
                }
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={sBtn()}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setFlags({ ...config, industry_profile: industryProfile });
              }}
              style={sBtn("outline")}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HQTenants() {
  const [tenants, setTenants] = useState([]);
  const [configs, setConfigs] = useState({});
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simWiping, setSimWiping] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsR, configsR, usageR] = await Promise.all([
        supabase
          .from("tenants")
          .select(
            "id,name,slug,type,tier,is_active,created_at,location_city,location_province,health_score,activation_rate,monthly_unit_avg,industry_profile",
          )
          .order("created_at", { ascending: true }),
        supabase
          .from("tenant_config")
          .select(
            "tenant_id,tier,feature_hq,feature_ai_basic,feature_ai_full,feature_medical,feature_white_label,feature_wholesale,feature_hr,ai_queries_daily,staff_seats,trial_ends_at,billing_cycle",
          ),
        supabase
          .from("tenant_usage_log")
          .select("tenant_id,metric,value,recorded_at")
          .gte(
            "recorded_at",
            new Date(Date.now() - 30 * 86400000).toISOString(),
          ),
      ]);
      if (tenantsR.error) throw tenantsR.error;
      setTenants(tenantsR.data || []);

      // Index configs by tenant_id
      const cfgMap = {};
      (configsR.data || []).forEach((c) => {
        cfgMap[c.tenant_id] = c;
      });
      setConfigs(cfgMap);

      // Aggregate usage by tenant + metric
      const usageMap = {};
      (usageR.data || []).forEach((u) => {
        if (!usageMap[u.tenant_id]) usageMap[u.tenant_id] = {};
        if (!usageMap[u.tenant_id][u.metric])
          usageMap[u.tenant_id][u.metric] = 0;
        usageMap[u.tenant_id][u.metric] += parseFloat(u.value || 0);
      });
      setUsage(usageMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const activeTenants = tenants.filter((t) => t.is_active !== false);
  const totalTenants = tenants.length;

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px",
          color: T.ink500,
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: `2px solid ${T.ink150}`,
            borderTopColor: T.accent,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Loading tenants...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          ...sCard,
          border: `1px solid ${T.dangerBd}`,
          borderLeft: `3px solid ${T.danger}`,
        }}
      >
        <div style={sLabel}>Error</div>
        <p
          style={{
            fontSize: "13px",
            color: T.danger,
            margin: "8px 0 0",
            fontFamily: T.font,
          }}
        >
          {error}
        </p>
        <button onClick={fetchAll} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );

  return (
    <div style={{ fontFamily: T.font, display: "grid", gap: "20px" }}>
      {showAdd && (
        <TenantSetupWizard
          onClose={() => setShowAdd(false)}
          onSaved={fetchAll}
          showToast={showToast}
        />
      )}

      {toast && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: T.font,
            fontWeight: 500,
            background: toast.type === "error" ? T.dangerBg : T.successBg,
            color: toast.type === "error" ? T.danger : T.success,
            border: `1px solid ${toast.type === "error" ? T.dangerBd : T.successBd}`,
          }}
        >
          {toast.type === "error" ? "✗ " : "✓ "}
          {toast.msg}
        </div>
      )}

      {/* Header + add button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: T.accent,
              fontFamily: T.font,
            }}
          >
            Tenant Management
          </div>
          <div
            style={{
              fontSize: 12,
              color: T.ink500,
              fontFamily: T.font,
              marginTop: 2,
            }}
          >
            {totalTenants} tenant{totalTenants !== 1 ? "s" : ""} ·{" "}
            {activeTenants.length} active
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ ...sBtn(), padding: "10px 20px" }}
        >
          + Add New Tenant
        </button>
      </div>

      {/* ── Dev — Sales Simulator ── */}
      <div style={{
        ...sCard,
        borderLeft: `3px solid ${T.info || "#2563EB"}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        padding: "12px 16px",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.ink500, fontFamily: T.font }}>
          Dev — Sales Simulator
        </span>
        <button
          disabled={simRunning}
          onClick={async () => {
            setSimRunning(true);
            try {
              const { data, error: err } = await supabase.functions.invoke("sim-pos-sales", { body: { days: 30, orders_per_day: 15 } });
              if (err) throw err;
              showToast(`Sim 30d: ${data?.summary?.orders_created || "?"} orders, ${data?.summary?.total_revenue_simulated || "?"}`, "success");
            } catch (e) { showToast("Sim failed: " + String(e), "error"); }
            setSimRunning(false);
          }}
          style={{ ...sBtn(), fontSize: 10, padding: "6px 12px", opacity: simRunning ? 0.5 : 1 }}
        >
          {simRunning ? "Running…" : "▶ Run 30 Days"}
        </button>
        <button
          disabled={simRunning}
          onClick={async () => {
            setSimRunning(true);
            try {
              const { data, error: err } = await supabase.functions.invoke("sim-pos-sales", { body: { days: 7, orders_per_day: 12 } });
              if (err) throw err;
              showToast(`Sim 7d: ${data?.summary?.orders_created || "?"} orders`, "success");
            } catch (e) { showToast("Sim failed: " + String(e), "error"); }
            setSimRunning(false);
          }}
          style={{ ...sBtn(), fontSize: 10, padding: "6px 12px", opacity: simRunning ? 0.5 : 1 }}
        >
          ▶ Run 7 Days
        </button>
        <button
          disabled={simWiping}
          onClick={async () => {
            if (!window.confirm("Delete ALL sim data (sim_data_v1)? This cannot be undone.")) return;
            setSimWiping(true);
            try {
              const tid = "b1bad266-ceb4-4558-bbc3-22cfeeeafe74";
              const tag = "sim_data_v1";
              await supabase.from("eod_cash_ups").delete().eq("notes", tag).eq("tenant_id", tid);
              await supabase.from("pos_sessions").delete().eq("notes", tag).eq("tenant_id", tid);
              await supabase.from("stock_movements").delete().eq("notes", tag).eq("tenant_id", tid);
              // order_items cascade: get order ids first
              const { data: simOrders } = await supabase.from("orders").select("id").eq("notes", tag).eq("tenant_id", tid);
              if (simOrders?.length) {
                const ids = simOrders.map(o => o.id);
                for (let i = 0; i < ids.length; i += 100) {
                  await supabase.from("order_items").delete().in("order_id", ids.slice(i, i + 100));
                }
              }
              await supabase.from("orders").delete().eq("notes", tag).eq("tenant_id", tid);
              showToast("Sim data wiped", "success");
            } catch (e) { showToast("Wipe failed: " + String(e), "error"); }
            setSimWiping(false);
          }}
          style={{
            ...sBtn(),
            fontSize: 10,
            padding: "6px 12px",
            background: T.dangerBg || "#FEF2F2",
            color: T.danger || "#991B1B",
            border: `1px solid ${T.dangerBd || "#FECACA"}`,
            opacity: simWiping ? 0.5 : 1,
          }}
        >
          {simWiping ? "Wiping…" : "🗑 Wipe Sim Data"}
        </button>
      </div>

      {/* Metric strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        {[
          { label: "Total Tenants", value: totalTenants, color: T.ink900 },
          { label: "Active", value: activeTenants.length, color: T.success },
          {
            label: "Enterprise",
            value: tenants.filter(
              (t) => (configs[t.id]?.tier || t.tier) === "enterprise",
            ).length,
            color: T.accent,
          },
          {
            label: "Pro",
            value: tenants.filter(
              (t) => (configs[t.id]?.tier || t.tier) === "pro",
            ).length,
            color: T.info,
          },
          {
            label: "Entry",
            value: tenants.filter(
              (t) => (configs[t.id]?.tier || t.tier) === "entry",
            ).length,
            color: T.ink500,
          },
        ].map((m) => (
          <div
            key={m.label}
            style={{ background: "#fff", padding: "16px 18px" }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: "6px",
                fontFamily: T.font,
                fontWeight: 700,
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: "24px",
                fontWeight: 400,
                color: m.color,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tenant cards */}
      {tenants.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            padding: "60px",
            color: T.ink500,
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏢</div>
          <p style={{ fontFamily: T.font, fontSize: "14px" }}>
            No tenants found.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            style={{ ...sBtn(), marginTop: 16 }}
          >
            + Add First Tenant
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {tenants.map((tenant) => {
            const cfg = configs[tenant.id] || {};
            const use = usage[tenant.id] || {};
            const isOpen = expanded === tenant.id;

            return (
              <div
                key={tenant.id}
                style={{
                  ...sCard,
                  borderLeft: `3px solid ${tenant.is_active === false ? T.ink300 : (configs[tenant.id]?.tier || tenant.tier) === "enterprise" ? T.accent : (configs[tenant.id]?.tier || tenant.tier) === "pro" ? T.info : T.ink400}`,
                  opacity: tenant.is_active === false ? 0.65 : 1,
                }}
              >
                {/* Tenant header row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: T.ink900,
                          fontFamily: T.font,
                        }}
                      >
                        {tenant.name}
                      </div>
                      <TierBadge tier={configs[tenant.id]?.tier || tenant.tier} />
                      {tenant.industry_profile && (
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "2px 8px",
                            borderRadius: "3px",
                            background: T.infoBg,
                            color: T.info,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            fontFamily: T.font,
                          }}
                        >
                          {INDUSTRY_PROFILES[tenant.industry_profile]?.icon}{" "}
                          {INDUSTRY_PROFILES[tenant.industry_profile]?.label ||
                            tenant.industry_profile}
                        </span>
                      )}
                      {tenant.is_active === false && (
                        <span
                          style={{
                            fontSize: "9px",
                            padding: "2px 8px",
                            borderRadius: "3px",
                            background: T.ink075,
                            color: T.ink400,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          Inactive
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: T.ink500,
                        fontFamily: T.font,
                        lineHeight: 1.6,
                      }}
                    >
                      {tenant.slug && (
                        <span style={{ marginRight: 10 }}>/{tenant.slug}</span>
                      )}
                      {tenant.type && (
                        <span
                          style={{
                            marginRight: 10,
                            textTransform: "capitalize",
                          }}
                        >
                          {tenant.type}
                        </span>
                      )}
                      {tenant.location_city && (
                        <span>
                          {tenant.location_city}
                          {tenant.location_province
                            ? `, ${tenant.location_province}`
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {tenant.health_score != null && (
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "9px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: T.ink400,
                            fontFamily: T.font,
                            fontWeight: 700,
                          }}
                        >
                          Health
                        </div>
                        <div
                          style={{
                            fontFamily: T.font,
                            fontSize: 18,
                            fontWeight: 400,
                            color:
                              tenant.health_score >= 70
                                ? T.success
                                : tenant.health_score >= 40
                                  ? T.warning
                                  : T.danger,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {tenant.health_score}
                        </div>
                      </div>
                    )}
                    {tenant.activation_rate != null && (
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: "9px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: T.ink400,
                            fontFamily: T.font,
                            fontWeight: 700,
                          }}
                        >
                          Activation
                        </div>
                        <div
                          style={{
                            fontFamily: T.font,
                            fontSize: 18,
                            fontWeight: 400,
                            color: T.info,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {(
                            parseFloat(tenant.activation_rate || 0) * 100
                          ).toFixed(0)}
                          %
                        </div>
                      </div>
                    )}
                    {Object.keys(use).length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: "9px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: T.ink400,
                            fontFamily: T.font,
                            fontWeight: 700,
                            marginBottom: 2,
                          }}
                        >
                          30-day activity
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {Object.entries(use)
                            .slice(0, 3)
                            .map(([metric, val]) => (
                              <span
                                key={metric}
                                style={{
                                  fontSize: 10,
                                  color: T.ink500,
                                  fontFamily: T.font,
                                }}
                              >
                                {metric}:{" "}
                                <strong style={{ color: T.ink700 }}>
                                  {Math.round(val)}
                                </strong>
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setExpanded(isOpen ? null : tenant.id)}
                      style={{
                        ...sBtn("outline"),
                        padding: "5px 12px",
                        fontSize: "9px",
                      }}
                    >
                      {isOpen ? "▲ Hide" : "▼ Manage"}
                    </button>
                  </div>
                </div>

                {/* Expanded: feature flags + config */}
                {isOpen && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: `1px solid ${T.ink150}`,
                    }}
                  >
                    <div style={{ ...sLabel, marginBottom: 8 }}>
                      Feature Flags & Limits
                    </div>
                    {Object.keys(cfg).length === 0 ? (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: 6,
                          background: T.ink050,
                          border: `1px solid ${T.ink150}`,
                          fontFamily: T.font,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: T.ink500,
                            marginBottom: 10,
                          }}
                        >
                          No feature config found for this tenant. This is
                          normal for newly added tenants — create a default
                          config to enable feature flags.
                        </div>
                        <button
                          onClick={async () => {
                            const { error } =
                              await import("../../services/supabaseClient").then(
                                (m) =>
                                  m.supabase.from("tenant_config").insert({
                                    tenant_id: tenant.id,
                                    tier: "entry",
                                    feature_hq: false,
                                    feature_ai_basic: false,
                                    feature_ai_full: false,
                                    feature_medical: false,
                                    feature_white_label: false,
                                    feature_wholesale: false,
                                    feature_hr: false,
                                    ai_queries_daily: 50,
                                    staff_seats: 5,
                                  }),
                              );
                            if (!error) {
                              showToast("Default config created");
                              fetchAll();
                            } else
                              showToast("Error: " + error.message, "error");
                          }}
                          style={{
                            padding: "6px 14px",
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: T.font,
                            background: T.accent,
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          Create default config
                        </button>
                      </div>
                    ) : (
                      <FlagEditor
                        tenantId={tenant.id}
                        config={cfg}
                        industryProfile={
                          tenant.industry_profile || "cannabis_retail"
                        }
                        onSaved={fetchAll}
                        showToast={showToast}
                      />
                    )}

                    {/* Tenant DB info */}
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: `1px solid ${T.ink075}`,
                      }}
                    >
                      <div
                        style={{ display: "flex", gap: 20, flexWrap: "wrap" }}
                      >
                        {[
                          ["Tenant ID", tenant.id],
                          [
                            "Created",
                            tenant.created_at
                              ? new Date(tenant.created_at).toLocaleDateString(
                                  "en-ZA",
                                )
                              : "—",
                          ],
                          cfg.trial_ends_at
                            ? [
                                "Trial ends",
                                new Date(cfg.trial_ends_at).toLocaleDateString(
                                  "en-ZA",
                                ),
                              ]
                            : null,
                          cfg.billing_cycle
                            ? ["Billing", cfg.billing_cycle]
                            : null,
                        ]
                          .filter(Boolean)
                          .map(([lbl, val]) => (
                            <div key={lbl}>
                              <div
                                style={{
                                  fontSize: "9px",
                                  letterSpacing: "0.1em",
                                  textTransform: "uppercase",
                                  color: T.ink400,
                                  fontFamily: T.font,
                                  fontWeight: 700,
                                }}
                              >
                                {lbl}
                              </div>
                              <div
                                style={{
                                  fontFamily: T.font,
                                  fontSize: 11,
                                  color: T.ink700,
                                  marginTop: 2,
                                }}
                              >
                                {val}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
