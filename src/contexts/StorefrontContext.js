// src/contexts/StorefrontContext.js — WP-MULTISITE v1.0
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS DOES:
//   Public storefront routes (/shop, /cart, /checkout) have no logged-in user.
//   This context resolves the current domain → tenant on app load.
//   Shop.js and CheckoutPage.js read from this instead of hardcoded tenant IDs.
//
// HOW IT WORKS:
//   1. Read window.location.hostname
//   2. On localhost → use REACT_APP_DEV_TENANT_ID from .env.local
//   3. On real domain → query tenants WHERE domain = hostname
//   4. Expose { storefrontTenantId, brandingConfig, tenantName, loading }
//
// USED BY:
//   App.js         → wraps public routes in <StorefrontProvider>
//   Shop.js        → reads storefrontTenantId for product queries
//   CheckoutPage.js → replaces hardcoded HQ_TENANT_ID
//   ClientHeader   → reads brandingConfig for brand name + colours
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";

const StorefrontContext = createContext(null);

// ── Default branding (fallback if no branding_config set) ──────────────────
const DEFAULT_BRANDING = {
  brand_name: "Pure Premium THC Vapes",
  tagline: "Premium. Pure. Delivered.",
  bg_color: "#FFFFFF",
  text_color: "#0A0A0A",
  accent_color: "#0A0A0A",
  card_bg: "#F8F8F8",
  border_color: "#E0E0E0",
  nav_bg: "#FFFFFF",
  btn_bg: "#0A0A0A",
  btn_text: "#FFFFFF",
};

// ── Wizard → storefront branding mapper ────────────────────────────────────
// The onboarding wizard writes its own keys to branding_config:
//   { primary_color, font_family, terminology_profile, template,
//     logo_url, wizard_complete, launched_at }
// Storefront consumers (Shop.js, ClientHeader) read different keys:
//   brand_name, accent_color, btn_bg, btn_text, etc.
// This mapper merges DEFAULT_BRANDING ← wizard keys ← raw branding_config
// so that wizard-launched tenants render correctly without forcing the
// owner to fill every legacy field.
function mergeBranding(tenantRow) {
  const cfg = (tenantRow && tenantRow.branding_config) || {};
  const merged = { ...DEFAULT_BRANDING, ...cfg };

  // brand_name falls back to tenants.name when not in JSON
  if (!cfg.brand_name && tenantRow?.name) {
    merged.brand_name = tenantRow.name;
  }
  // wizard primary_color drives accent + button background
  if (cfg.primary_color) {
    merged.accent_color = cfg.accent_color || cfg.primary_color;
    merged.btn_bg = cfg.btn_bg || cfg.primary_color;
    if (!cfg.btn_text) merged.btn_text = "#FFFFFF";
  }
  return merged;
}

// Hard fallback tenant — Pure PTV — used only when every other path fails
const HARD_FALLBACK_ID = "f8ff8d07-7688-44a7-8714-5941ab4ceaa5";

// ── Provider ────────────────────────────────────────────────────────────────
export function StorefrontProvider({ children }) {
  const [storefrontTenantId, setStorefrontTenantId] = useState(null);
  const [brandingConfig, setBrandingConfig] = useState(DEFAULT_BRANDING);
  const [tenantName, setTenantName] = useState("");
  const [industryProfile, setIndustryProfile] = useState("cannabis_retail");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Single source-of-truth decision tree:
    //   1. /shop/<slug> path  → query by slug
    //   2. real hostname       → query by domain
    //   3. dev hostname        → REACT_APP_DEV_TENANT_ID or hard fallback
    //   4. anything still null → hard fallback
    // ALL state is applied in a single batch at the very end. No partial
    // updates, no early returns, no race between paths.
    async function resolveStorefront() {
      let resolved = null; // {id, name, industry_profile, branding_config}

      try {
        const hostname = window.location.hostname;
        const isDevHost =
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.includes("vercel.app");

        // ── 1. Path-slug — wins over everything else ────────────────────
        const pathMatch = window.location.pathname.match(
          /^\/shop\/([a-z0-9-]+)\/?$/i,
        );
        const pathSlug = pathMatch?.[1] || null;
        if (pathSlug) {
          const { data, error } = await supabase
            .from("tenants")
            .select("id, name, industry_profile, branding_config")
            .eq("slug", pathSlug)
            .maybeSingle();
          if (data) {
            resolved = data;
            console.log(
              "[Storefront] Resolved by slug:",
              data.name,
              `(${pathSlug})`,
            );
          } else if (error) {
            console.warn("[Storefront] Slug query error:", error.message);
          } else {
            console.warn(
              "[Storefront] No tenant for slug:",
              pathSlug,
              "— falling through",
            );
          }
        }

        // ── 2. Real production hostname ─────────────────────────────────
        if (!resolved && !isDevHost) {
          const { data } = await supabase
            .from("tenants")
            .select("id, name, industry_profile, branding_config")
            .eq("domain", hostname)
            .maybeSingle();
          if (data) {
            resolved = data;
            console.log(
              "[Storefront] Resolved by hostname:",
              data.name,
              `(${hostname})`,
            );
          }
        }

        // ── 3. Dev fallback (localhost / vercel.app) ────────────────────
        if (!resolved && isDevHost) {
          const fallbackId =
            process.env.REACT_APP_DEV_TENANT_ID || HARD_FALLBACK_ID;
          const { data } = await supabase
            .from("tenants")
            .select("id, name, industry_profile, branding_config")
            .eq("id", fallbackId)
            .maybeSingle();
          if (data) {
            resolved = data;
            console.log("[Storefront] Dev fallback:", data.name);
          }
        }

        // ── 4. Hard fallback — never leave null ─────────────────────────
        if (!resolved) {
          const { data } = await supabase
            .from("tenants")
            .select("id, name, industry_profile, branding_config")
            .eq("id", HARD_FALLBACK_ID)
            .maybeSingle();
          resolved = data;
          if (data) {
            console.log("[Storefront] Hard fallback:", data.name);
          }
        }
      } catch (err) {
        console.error("[Storefront] Resolution error:", err);
      }

      if (cancelled) return;

      // ── Single state batch — applied once, atomically ────────────────
      if (resolved) {
        setStorefrontTenantId(resolved.id);
        setTenantName(resolved.name || "");
        setIndustryProfile(resolved.industry_profile || "cannabis_retail");
        setBrandingConfig(mergeBranding(resolved));
      } else {
        // Last-resort: even the hard fallback failed (network error, etc.)
        setStorefrontTenantId(HARD_FALLBACK_ID);
      }
      setLoading(false);
    }

    resolveStorefront();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    storefrontTenantId,
    brandingConfig,
    tenantName,
    industryProfile,
    loading,
  };

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error("useStorefront must be used within a StorefrontProvider");
  }
  return context;
}

export default StorefrontContext;
