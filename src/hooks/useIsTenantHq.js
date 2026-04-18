// src/hooks/useIsTenantHq.js
// WTU 2A.5 — role gate for CRUD actions in tenant-facing surfaces.
//
// Returns true if the current user is:
//   - a super admin (user_profiles.hq_access = true), OR
//   - a tenant HQ user (role IN ('admin', 'retailer', 'management'))
//     whose user_profiles.tenant_id matches the context tenant.
//
// Normal employees (role = 'customer' or null) return false, gating them
// to read + add-only flows. The server-side RLS fnb_tenant_update and
// fnb_tenant_delete policies enforce the same rule via is_staff_or_admin().

import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useTenant } from "../services/tenantService";

const HQ_ROLES = ["admin", "retailer", "management"];

export function useIsTenantHq() {
  const { tenantId } = useTenant();
  const [isHq, setIsHq] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("user_profiles")
          .select("role, hq_access, tenant_id")
          .eq("id", user.id)
          .single();
        if (cancelled || !data) return;
        const isSuperAdmin = !!data.hq_access;
        const isTenantRole = HQ_ROLES.includes(data.role) && data.tenant_id === tenantId;
        setIsHq(isSuperAdmin || isTenantRole);
      } catch (_) {
        // Default to false on any error — safer than accidental grant
      }
    })();
    return () => { cancelled = true; };
  }, [tenantId]);

  return isHq;
}
