// src/services/tenantService.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// TENANT CONTEXT PROVIDER
//
// Provides the active tenant (shop/HQ) to all components.
// Loads tenant data from user_profiles.tenant_id on login.
// HQ users (hq_access=true) can switch between tenants.
//
// Usage:
//   import { TenantProvider, useTenant } from '../services/tenantService';
//
//   // In App.js: wrap with <TenantProvider>
//   // In any component:
//   const { tenant, isHQ, allTenants, switchTenant } = useTenant();
//
// Phase 2A — Foundation. Created for multi-tenant architecture.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "./supabaseClient";

// ── Context ───────────────────────────────────────────────────────────────
const TenantContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────
export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null); // Active tenant object
  const [isHQ, setIsHQ] = useState(false); // Does user have hq_access?
  const [allTenants, setAllTenants] = useState([]); // HQ only: list of all tenants
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
        return;
      }

      // Get user's tenant_id and hq_access
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("tenant_id, hq_access")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("[TenantService] Profile fetch error:", profileError);
        setLoading(false);
        return;
      }

      const hasHQAccess = profile?.hq_access === true;
      setIsHQ(hasHQAccess);

      // Load the user's tenant
      if (profile?.tenant_id) {
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", profile.tenant_id)
          .single();

        if (tenantError) {
          console.error("[TenantService] Tenant fetch error:", tenantError);
        } else {
          setTenant(tenantData);
          console.log("[TenantService] Active tenant:", tenantData.name);
        }
      }

      // HQ users: load all tenants for the switcher
      if (hasHQAccess) {
        const { data: tenantsData, error: tenantsError } = await supabase
          .from("tenants")
          .select("*")
          .order("type", { ascending: false }) // HQ first, then shops
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
    } catch (err) {
      console.error("[TenantService] loadTenant error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Switch tenant (HQ only) ────────────────────────────────────────────
  const switchTenant = useCallback(
    (tenantObj) => {
      if (!isHQ) {
        console.warn("[TenantService] switchTenant blocked — not HQ user");
        return;
      }
      setTenant(tenantObj);
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
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadTenant();
      } else if (event === "SIGNED_OUT") {
        setTenant(null);
        setIsHQ(false);
        setAllTenants([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadTenant]);

  // ── Context value ──────────────────────────────────────────────────────
  const value = {
    tenant, // Current active tenant object (or null)
    tenantId: tenant?.id || null, // Shorthand for tenant.id
    tenantName: tenant?.name || null,
    tenantSlug: tenant?.slug || null,
    tenantType: tenant?.type || null, // 'hq' or 'shop'
    isHQ, // Does this user have HQ access?
    allTenants, // All tenants (HQ only, empty for shop users)
    switchTenant, // Switch active tenant (HQ only)
    loading, // Is tenant data still loading?
    reload: loadTenant, // Force reload tenant data
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
