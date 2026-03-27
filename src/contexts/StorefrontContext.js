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

// ── Provider ────────────────────────────────────────────────────────────────
export function StorefrontProvider({ children }) {
  const [storefrontTenantId, setStorefrontTenantId] = useState(null);
  const [brandingConfig, setBrandingConfig] = useState(DEFAULT_BRANDING);
  const [tenantName, setTenantName] = useState("");
  const [industryProfile, setIndustryProfile] = useState("cannabis_retail");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveStorefront() {
      try {
        const hostname = window.location.hostname;
        let tenantId = null;

        // ── Dev fallback: localhost uses env var ──────────────────────────
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.includes("vercel.app")
        ) {
          // On localhost or Vercel preview: use env var or fall back to Pure PTV
          tenantId =
            process.env.REACT_APP_DEV_TENANT_ID ||
            "f8ff8d07-7688-44a7-8714-5941ab4ceaa5";
          console.log("[Storefront] Dev mode — using tenant:", tenantId);
        } else {
          // ── Production: resolve from domain ────────────────────────────
          const { data, error } = await supabase
            .from("tenants")
            .select("id, name, industry_profile, branding_config")
            .eq("domain", hostname)
            .single();

          if (error || !data) {
            console.warn(
              "[Storefront] No tenant found for domain:",
              hostname,
              error?.message,
            );
            // Fall back to Pure PTV so shop doesn't break
            tenantId = "f8ff8d07-7688-44a7-8714-5941ab4ceaa5";
          } else {
            tenantId = data.id;
            setTenantName(data.name);
            setIndustryProfile(data.industry_profile || "cannabis_retail");
            if (
              data.branding_config &&
              Object.keys(data.branding_config).length > 0
            ) {
              setBrandingConfig({
                ...DEFAULT_BRANDING,
                ...data.branding_config,
              });
            }
            console.log(
              "[Storefront] Resolved tenant:",
              data.name,
              "for",
              hostname,
            );
          }
        }

        // If dev mode, still load branding from DB
        if (
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.includes("vercel.app")
        ) {
          const { data: tenantData } = await supabase
            .from("tenants")
            .select("name, industry_profile, branding_config")
            .eq("id", tenantId)
            .single();

          if (tenantData) {
            setTenantName(tenantData.name);
            setIndustryProfile(
              tenantData.industry_profile || "cannabis_retail",
            );
            if (
              tenantData.branding_config &&
              Object.keys(tenantData.branding_config).length > 0
            ) {
              setBrandingConfig({
                ...DEFAULT_BRANDING,
                ...tenantData.branding_config,
              });
            }
          }
        }

        setStorefrontTenantId(tenantId);
      } catch (err) {
        console.error("[Storefront] Resolution error:", err);
        // Hard fallback — never leave storefrontTenantId null
        setStorefrontTenantId("f8ff8d07-7688-44a7-8714-5941ab4ceaa5");
      } finally {
        setLoading(false);
      }
    }

    resolveStorefront();
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
