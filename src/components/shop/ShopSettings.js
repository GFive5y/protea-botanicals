// src/components/shop/ShopSettings.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// SHOP SETTINGS — Phase 2F (Task 27)
//
// Shop branding configuration. Reads/writes tenants.branding jsonb:
//   - logo_url: URL to shop logo
//   - primary_color: hex color for headers/buttons
//   - accent_color: hex color for highlights
//   - tagline: optional shop tagline
//
// Updates only the branding field — never touches type, is_active, etc.
// LL-049: Always check r.error after Supabase queries.
// Design: Cream aesthetic per Section 7 of handover.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

// ── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  bg: "#faf9f6",
  warmBg: "#f4f0e8",
  primaryDark: "#1b4332",
  primaryMid: "#2d6a4f",
  accentGreen: "#52b788",
  gold: "#b5935a",
  text: "#1a1a1a",
  muted: "#888888",
  border: "#e8e0d4",
  white: "#ffffff",
  red: "#c0392b",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

export default function ShopSettings() {
  const { tenant, tenantId, reload } = useTenant();
  const [branding, setBranding] = useState({
    logo_url: "",
    primary_color: "#1b4332",
    accent_color: "#b5935a",
    tagline: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Load current branding from tenant ───────────────────────────────
  const loadBranding = useCallback(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }

    const b = tenant.branding || {};
    setBranding({
      logo_url: b.logo_url || "",
      primary_color: b.primary_color || "#1b4332",
      accent_color: b.accent_color || "#b5935a",
      tagline: b.tagline || "",
    });
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  // ── Save branding ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    setMessage(null);

    try {
      const newBranding = {
        logo_url: branding.logo_url.trim() || null,
        primary_color: branding.primary_color || "#1b4332",
        accent_color: branding.accent_color || "#b5935a",
        tagline: branding.tagline.trim() || null,
      };

      const { error } = await supabase
        .from("tenants")
        .update({ branding: newBranding })
        .eq("id", tenantId);

      if (error) {
        console.error("[ShopSettings] save error:", error);
        setMessage({ type: "error", text: "Failed to save: " + error.message });
      } else {
        setMessage({ type: "success", text: "Branding saved successfully" });
        reload(); // Refresh tenant context
      }
    } catch (err) {
      console.error("[ShopSettings] save exception:", err);
      setMessage({ type: "error", text: "Unexpected error saving branding" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const updateField = (field, value) => {
    setBranding((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            border: `3px solid ${C.border}`,
            borderTopColor: C.primaryDark,
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <style>{`@keyframes protea-spin { to { transform: rotate(360deg); } }`}</style>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Loading settings…
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* ── Message Toast ───────────────────────────────────── */}
      {message && (
        <div
          style={{
            background:
              message.type === "success" ? "rgba(82,183,136,0.1)" : "#fdf2f2",
            border: `1px solid ${
              message.type === "success" ? C.accentGreen : "#fecaca"
            }`,
            borderRadius: "2px",
            padding: "10px 16px",
            marginBottom: "16px",
            color: message.type === "success" ? C.primaryDark : C.red,
            fontSize: "13px",
          }}
        >
          {message.type === "success" ? "✓" : "✕"} {message.text}
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}
      >
        {/* ── Left: Branding Form ─────────────────────────── */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            padding: "24px",
          }}
        >
          <h4
            style={{
              fontFamily: FONTS.heading,
              fontSize: "18px",
              fontWeight: 300,
              color: C.primaryDark,
              margin: "0 0 20px 0",
            }}
          >
            Shop Branding
          </h4>

          {/* Shop Name (read-only) */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Shop Name</label>
            <input
              value={tenant?.name || ""}
              disabled
              style={{
                ...inputStyle,
                background: C.warmBg,
                color: C.muted,
                cursor: "not-allowed",
              }}
            />
            <span
              style={{
                fontSize: "10px",
                color: C.muted,
                fontStyle: "italic",
              }}
            >
              Contact HQ to change shop name
            </span>
          </div>

          {/* Tagline */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Tagline</label>
            <input
              type="text"
              value={branding.tagline}
              onChange={(e) => updateField("tagline", e.target.value)}
              placeholder="e.g. Premium cannabis, curated for you"
              style={inputStyle}
              maxLength={120}
            />
          </div>

          {/* Logo URL */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Logo URL</label>
            <input
              type="url"
              value={branding.logo_url}
              onChange={(e) => updateField("logo_url", e.target.value)}
              placeholder="https://example.com/logo.png"
              style={inputStyle}
            />
            <span
              style={{
                fontSize: "10px",
                color: C.muted,
                fontStyle: "italic",
              }}
            >
              Direct link to your logo image (PNG or SVG recommended)
            </span>
          </div>

          {/* Primary Color */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Primary Colour</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="color"
                value={branding.primary_color}
                onChange={(e) => updateField("primary_color", e.target.value)}
                style={{
                  width: "48px",
                  height: "36px",
                  border: `1px solid ${C.border}`,
                  borderRadius: "2px",
                  padding: "2px",
                  cursor: "pointer",
                  background: C.white,
                }}
              />
              <input
                type="text"
                value={branding.primary_color}
                onChange={(e) => updateField("primary_color", e.target.value)}
                style={{
                  ...inputStyle,
                  flex: 1,
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
                maxLength={7}
                pattern="^#[0-9A-Fa-f]{6}$"
              />
              <span style={{ fontSize: "11px", color: C.muted }}>
                Headers, buttons, nav
              </span>
            </div>
          </div>

          {/* Accent Color */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Accent Colour</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="color"
                value={branding.accent_color}
                onChange={(e) => updateField("accent_color", e.target.value)}
                style={{
                  width: "48px",
                  height: "36px",
                  border: `1px solid ${C.border}`,
                  borderRadius: "2px",
                  padding: "2px",
                  cursor: "pointer",
                  background: C.white,
                }}
              />
              <input
                type="text"
                value={branding.accent_color}
                onChange={(e) => updateField("accent_color", e.target.value)}
                style={{
                  ...inputStyle,
                  flex: 1,
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
                maxLength={7}
                pattern="^#[0-9A-Fa-f]{6}$"
              />
              <span style={{ fontSize: "11px", color: C.muted }}>
                Highlights, badges, prices
              </span>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: C.primaryDark,
              color: C.white,
              border: "none",
              borderRadius: "2px",
              padding: "12px 28px",
              cursor: saving ? "wait" : "pointer",
              fontFamily: FONTS.body,
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              opacity: saving ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {saving ? "Saving…" : "Save Branding"}
          </button>
        </div>

        {/* ── Right: Preview ──────────────────────────────── */}
        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            padding: "24px",
          }}
        >
          <h4
            style={{
              fontFamily: FONTS.heading,
              fontSize: "18px",
              fontWeight: 300,
              color: C.primaryDark,
              margin: "0 0 20px 0",
            }}
          >
            Preview
          </h4>

          {/* Mini preview of branding */}
          <div
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            {/* Preview header */}
            <div
              style={{
                background: branding.primary_color || C.primaryDark,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              {branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt="Logo"
                  style={{
                    width: "32px",
                    height: "32px",
                    objectFit: "contain",
                    borderRadius: "2px",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  🌿
                </div>
              )}
              <div>
                <div
                  style={{
                    color: C.white,
                    fontFamily: FONTS.heading,
                    fontSize: "16px",
                    fontWeight: 300,
                  }}
                >
                  {tenant?.name || "Your Shop"}
                </div>
                {branding.tagline && (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {branding.tagline}
                  </div>
                )}
              </div>
            </div>

            {/* Preview body */}
            <div style={{ padding: "20px" }}>
              <div
                style={{
                  fontSize: "13px",
                  color: C.text,
                  marginBottom: "12px",
                }}
              >
                Sample product card with your colours
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <button
                  style={{
                    background: branding.primary_color || C.primaryDark,
                    color: C.white,
                    border: "none",
                    borderRadius: "2px",
                    padding: "8px 16px",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    fontFamily: FONTS.body,
                    cursor: "default",
                  }}
                >
                  Primary Button
                </button>
                <button
                  style={{
                    background: branding.accent_color || C.gold,
                    color: C.white,
                    border: "none",
                    borderRadius: "2px",
                    padding: "8px 16px",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    fontFamily: FONTS.body,
                    cursor: "default",
                  }}
                >
                  Accent Button
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    background: `${branding.primary_color}15`,
                    color: branding.primary_color || C.primaryDark,
                    padding: "3px 10px",
                    borderRadius: "2px",
                    fontSize: "9px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Badge
                </span>
                <span
                  style={{
                    background: `${branding.accent_color}20`,
                    color: branding.accent_color || C.gold,
                    padding: "3px 10px",
                    borderRadius: "2px",
                    fontSize: "9px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Accent
                </span>
              </div>
            </div>
          </div>

          {/* Tenant info */}
          <div style={{ marginTop: "20px" }}>
            <h4
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.muted,
                margin: "0 0 10px 0",
              }}
            >
              Tenant Details
            </h4>
            <div
              style={{
                fontSize: "12px",
                color: C.text,
                lineHeight: 1.8,
              }}
            >
              <div>
                <strong>Slug:</strong>{" "}
                <code style={{ fontSize: "10px", color: C.muted }}>
                  {tenant?.slug || "—"}
                </code>
              </div>
              <div>
                <strong>Type:</strong> {tenant?.type || "—"}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color: tenant?.is_active ? C.accentGreen : C.red,
                  }}
                >
                  {tenant?.is_active ? "● Active" : "○ Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared Styles ────────────────────────────────────────────────────────
const labelStyle = {
  display: "block",
  fontFamily: "'Jost', sans-serif",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#888",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #e8e0d4",
  borderRadius: "2px",
  fontFamily: "'Jost', sans-serif",
  fontSize: "13px",
  color: "#1a1a1a",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};
