// src/contexts/TokenContext.js
// WP-DS-6 Phase 3 — Profile-Aware Token Context
// HQ always uses base T (no arg). TenantPortal supplies getTokens(industryProfile).
// Usage — Provider: <TokenContext.Provider value={getTokens(industryProfile)}>
// Usage — Consumer: const tokens = useTokens();

import { createContext, useContext } from "react";
import { T } from "../styles/tokens";

export const TokenContext = createContext(T);

export function useTokens() {
  return useContext(TokenContext);
}
