// src/contexts/IntelligenceContext.js
// WP-AINS Phase 1 — Intelligence Foundation (updated Phase 2)
// Provider accepts pre-computed value so TenantPortal can call
// useNavIntelligence in its own function body and share via context.

import { createContext, useContext } from "react";

export const IntelligenceContext = createContext(null);

// value = return value of useNavIntelligence({ data, loading, refresh })
export function IntelligenceProvider({ value, children }) {
  return (
    <IntelligenceContext.Provider value={value}>
      {children}
    </IntelligenceContext.Provider>
  );
}

// Safe hook — returns empty state if called outside provider
export function useIntelligence() {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) return { data: null, loading: true, refresh: () => {} };
  return ctx;
}
