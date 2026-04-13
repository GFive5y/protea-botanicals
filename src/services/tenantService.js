// src/services/tenantService.js — Protea Botanicals v1.1
// ─────────────────────────────────────────────────────────────────────────────
// TENANT CONTEXT PROVIDER
//
// v1.1 FIX (2026-03-08):
//   PROBLEM: onAuthStateChange called loadTenant() on every SIGNED_IN event.
//   Supabase fires SIGNED_IN repeatedly (token refresh, re-auth, etc).
//   Each loadTenant() call mutated state → caused RequireAuth to briefly see
//   no role → redirected to /account → logged in → SIGNED_IN → loop.
//   Each loop iteration mounted a new AdminDashboard on top of the existing one.
//
//   FIX: Use a hasLoaded ref. Only call loadTenant() on SIGNED_IN if we have
//   NOT already loaded tenant data. On SIGNED_OUT, reset the ref so next
//   login loads fresh. TOKEN_REFRESHED no longer triggers a reload at all
//   (tenant data doesn't change when token refreshes).
//
// v1.0: Initial implementation
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "./supabaseClient";

// ── Context ───────────────────────────────────────────────────────────────
const TenantContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────
export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [isHQ, setIsHQ] = useState(false);
  const [allTenants, setAllTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantConfig, setTenantConfig] = useState({});
  const [isOperator, setIsOperator] = useState(false);
  const [userRole, setUserRole] = useState("staff");

  // ★ v1.1: Track whether we've already loaded tenant data.
  // Prevents reloading on every SIGNED_IN event (Supabase fires this repeatedly).
  const hasLoaded = useRef(false);

  // ── Load tenant from current user's profile ────────────────────────────
  const loadTenant = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setTenant(null);
        setIsHQ(false);
        setAllTenants([]);
        setTenantConfig({});
        setLoading(false);
        return;
      }

      // Get user's tenant_id and hq_access
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("tenant_id, hq_access, is_operator, role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("[TenantService] Profile fetch error:", profileError);
        setLoading(false);
        return;
      }

      const hasHQAccess = profile?.hq_access === true;
      setIsHQ(hasHQAccess);
      setIsOperator(profile?.is_operator === true);
      setUserRole(profile?.role || "staff");

      // Load the user's tenant
      if (profile?.tenant_id) {
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .select("*,industry_profile")
          .eq("id", profile.tenant_id)
          .single();

        if (tenantError) {
          console.error("[TenantService] Tenant fetch error:", tenantError);
        } else {
          setTenant(tenantData);
          console.log("[TenantService] Active tenant:", tenantData.name);
        }
        // v1.2: Load tenant_config feature flags (independent — never blocks login)
        try {
          const { data: cfgData } = await supabase
            .from("tenant_config")
            .select(
              "feature_hq,feature_ai_basic,feature_ai_full,feature_medical,feature_white_label,feature_wholesale,feature_hr,ai_queries_daily,staff_seats,tier",
            )
            .eq("tenant_id", profile.tenant_id)
            .single();
          setTenantConfig(cfgData || {});
        } catch (_) {
          setTenantConfig({});
        }
      }

      // HQ users: load all tenants for the switcher
      if (hasHQAccess) {
        const { data: tenantsData, error: tenantsError } = await supabase
          .from("tenants")
          .select("*")
          .order("type", { ascending: false })
          .order("name");

        if (tenantsError) {
          console.error(
            "[TenantService] All tenants fetch error:",
            tenantsError,
          );
        } else {
          setAllTenants(tenantsData || []);
          console.log(
            "[TenantService] HQ loaded",
            tenantsData?.length,
            "tenants",
          );
        }
      }

      // ★ v1.1: Mark as loaded so SIGNED_IN doesn't trigger another load
      hasLoaded.current = true;
    } catch (err) {
      console.error("[TenantService] loadTenant error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Switch tenant (HQ only) ────────────────────────────────────────────
  const switchTenant = useCallback(
    async (tenantObj) => {
      if (!isHQ) {
        console.warn("[TenantService] switchTenant blocked — not HQ user");
        return;
      }
      setTenant(tenantObj);
      try {
        const { data: cfgData } = await supabase
          .from("tenant_config")
          .select(
            "feature_hq,feature_ai_basic,feature_ai_full,feature_medical,feature_white_label,feature_wholesale,feature_hr,ai_queries_daily,staff_seats,tier",
          )
          .eq("tenant_id", tenantObj.id)
          .single();
        setTenantConfig(cfgData || {});
      } catch (_) {
        setTenantConfig({});
      }
      console.log("[TenantService] Switched to tenant:", tenantObj.name);
    },
    [isHQ],
  );

  // ── Load on mount + auth state changes ─────────────────────────────────
  useEffect(() => {
    loadTenant();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        // ★ v1.1: Only load if not already loaded.
        // Supabase fires SIGNED_IN on every token refresh and page focus.
        // Reloading every time caused RequireAuth to flicker → redirect loop
        // → stacked AdminDashboard instances.
        if (!hasLoaded.current) {
          loadTenant();
        }
      } else if (event === "SIGNED_OUT") {
        // ★ v1.1: Reset the loaded flag so next login gets fresh data
        hasLoaded.current = false;
        setTenant(null);
        setIsHQ(false);
        setAllTenants([]);
        setLoading(false);
      }
      // ★ v1.1: TOKEN_REFRESHED intentionally NOT handled here.
      // Tenant data doesn't change when the JWT refreshes.
      // Reloading on TOKEN_REFRESHED was another source of the loop.
    });

    return () => subscription.unsubscribe();
  }, [loadTenant]);

  // ── Context value ──────────────────────────────────────────────────────
  const value = {
    tenant,
    tenantId: tenant?.id || null,
    tenantName: tenant?.name || null,
    tenantSlug: tenant?.slug || null,
    tenantType: tenant?.type || null,
    isHQ,
    allTenants,
    switchTenant,
    loading,
    reload: loadTenant,
    tenantConfig,
    industryProfile: tenant?.industry_profile || "cannabis_retail",
    isOperator,
    role: userRole,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export default TenantContext;
