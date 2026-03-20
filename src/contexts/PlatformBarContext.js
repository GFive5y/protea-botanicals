// src/contexts/PlatformBarContext.js — v1.0
// WP-Z: Platform Intelligence Bar
//
// Provides the usePlatformBar() hook that allows any page or tab component
// to register page-specific icons into the PlatformBar's right-hand page zone.
//
// Usage in a page/tab component:
//   const { registerPageIcons, clearPageIcons } = usePlatformBar();
//
//   useEffect(() => {
//     registerPageIcons([{
//       id:         'stock-oos',
//       icon:       'box-down',
//       severity:   outOfStock.length > 0 ? 'danger' : null,
//       label:      'Out of stock',
//       panelTitle: 'OUT OF STOCK',
//       panelRows:  outOfStock.map(item => ({
//         title:  item.name,
//         sub:    `${item.quantity_on_hand} units`,
//         action: { label: 'Fix', handler: () => {} },
//       })),
//     }]);
//     return () => clearPageIcons();
//   }, [outOfStock]);
//
// severity: null   → icon renders quiet/dim (visible but not pulsing)
// severity: 'danger' | 'warning' | 'info' → icon pulses at severity speed

import { createContext, useContext, useState, useCallback } from "react";

const PlatformBarContext = createContext(null);

export function PlatformBarProvider({ children }) {
  const [pageIcons, setPageIcons] = useState([]);

  const registerPageIcons = useCallback((icons) => {
    setPageIcons(Array.isArray(icons) ? icons : []);
  }, []);

  const clearPageIcons = useCallback(() => {
    setPageIcons([]);
  }, []);

  return (
    <PlatformBarContext.Provider
      value={{ pageIcons, registerPageIcons, clearPageIcons }}
    >
      {children}
    </PlatformBarContext.Provider>
  );
}

export function usePlatformBar() {
  const ctx = useContext(PlatformBarContext);
  if (!ctx) {
    // Graceful fallback — component used outside provider
    return {
      pageIcons: [],
      registerPageIcons: () => {},
      clearPageIcons: () => {},
    };
  }
  return ctx;
}

export { PlatformBarContext };
