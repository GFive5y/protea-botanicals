// src/contexts/CartContext.js v1.0
// ─────────────────────────────────────────────────────────────────────────────
// Cart state management for Protea Botanicals shop.
// Provides: addToCart, removeFromCart, updateQuantity, clearCart,
//           getCartTotal, getCartCount.
// Persists to localStorage under key "protea_cart".
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext(null);

const LS_CART_KEY = "protea_cart";

// ── Helper: read cart from localStorage ─────────────────────────────────────
function loadCart() {
  try {
    const raw = localStorage.getItem(LS_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[CartContext] Failed to parse saved cart:", err);
    return [];
  }
}

// ── Provider ────────────────────────────────────────────────────────────────
export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(loadCart);

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    try {
      localStorage.setItem(LS_CART_KEY, JSON.stringify(cartItems));
      console.log("[CartContext] Cart saved:", cartItems.length, "items");
    } catch (err) {
      console.warn("[CartContext] Failed to save cart:", err);
    }
  }, [cartItems]);

  // ── Add item (increment qty if already in cart) ─────────────────────────
  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        console.log("[CartContext] Incrementing qty for:", product.name);
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      console.log("[CartContext] Adding new item:", product.name);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // ── Remove item completely ──────────────────────────────────────────────
  const removeFromCart = (productId) => {
    setCartItems((prev) => {
      console.log("[CartContext] Removing item id:", productId);
      return prev.filter((item) => item.id !== productId);
    });
  };

  // ── Update quantity (removes if qty < 1) ────────────────────────────────
  const updateQuantity = (productId, newQty) => {
    if (newQty < 1) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity: newQty } : item,
      ),
    );
  };

  // ── Clear entire cart ───────────────────────────────────────────────────
  const clearCart = () => {
    console.log("[CartContext] Cart cleared");
    setCartItems([]);
  };

  // ── Computed values ─────────────────────────────────────────────────────
  const getCartTotal = () =>
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getCartCount = () =>
    cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ── Hook for consuming components ─────────────────────────────────────────
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a <CartProvider>");
  }
  return ctx;
}

export default CartContext;
