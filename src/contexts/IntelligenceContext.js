// src/contexts/IntelligenceContext.js
// WP-AINS Phase 1 — Intelligence Foundation
// Single provider at TenantPortal level.
// One fetch, shared by NavSidebar, AIFixture, IntelStrip, NuAiBrief.
// Import useIntelligence() anywhere inside TenantPortal to access data.

import { createContext, useContext } from "react";
import { useNavIntelligence } from "../hooks/useNavIntelligence";

export const IntelligenceContext = createContext(null);

export function IntelligenceProvider({ tenantId, children }) {
  const intelligence = useNavIntelligence(tenantId);
  return (
    <IntelligenceContext.Provider value={intelligence}>
      {children}
    </IntelligenceContext.Provider>
  );
}

// Safe hook — returns empty state if used outside provider
export function useIntelligence() {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) return { data: null, loading: true, refresh: () => {} };
  return ctx;
}
