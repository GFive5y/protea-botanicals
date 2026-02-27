// src/pages/CheckoutPage.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// Checkout page with order summary and PayFast payment redirect.
// Uses PayFast sandbox test credentials (merchant_id: 10000100).
// Rendered inside PageShell via WithNav + RequireAuth.
// Per LL-017: no own wrapper, footer, or font import (PageShell provides).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { RoleContext } from "../App";
import { C } from "../styles/tokens";

// ── PayFast config ──────────────────────────────────────────────────────────
// Sandbox test credentials — replace with real credentials for production
const PAYFAST_CONFIG = {
  sandbox: true,
  merchant_id: "10000100",
  merchant_key: "46f0cd694581a",
  get baseUrl() {
    return this.sandbox
      ? "https://sandbox.payfast.co.za/eng/process"
      : "https://www.payfast.co.za/eng/process";
  },
};

export default function CheckoutPage() {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { userEmail } = useContext(RoleContext);
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const total = getCartTotal();

  // Redirect to cart if empty
  useEffect(() => {
    if (cartItems.length === 0 && !submitting) {
      navigate("/cart", { replace: true });
    }
  }, [cartItems, navigate, submitting]);

  // Build item name for PayFast (max 255 chars)
  const itemName =
    cartItems.length === 1
      ? cartItems[0].name
      : `Protea Botanicals Order (${cartItems.reduce((s, i) => s + i.quantity, 0)} items)`;

  // Generate simple order reference
  const orderRef = `PB-${Date.now().toString(36).toUpperCase()}`;

  const handlePayFast = () => {
    setSubmitting(true);
    console.log("[Checkout] Submitting to PayFast:", {
      total,
      items: cartItems.length,
      orderRef,
    });

    // Store order reference for success page
    try {
      localStorage.setItem(
        "protea_last_order",
        JSON.stringify({
          ref: orderRef,
          total,
          items: cartItems.map((i) => ({
            name: i.name,
            qty: i.quantity,
            price: i.price,
          })),
          date: new Date().toISOString(),
        }),
      );
    } catch (e) {
      console.warn("[Checkout] Could not save order to localStorage:", e);
    }

    // Clear cart before redirect (PayFast will redirect back)
    clearCart();

    // Submit the hidden form
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  if (cartItems.length === 0 && !submitting) {
    return null; // useEffect will redirect
  }

  // Current origin for return URLs
  const origin = window.location.origin;

  return (
    <>
      <style>{`
        .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
        .body-font { font-family: 'Jost', sans-serif; }
      `}</style>

      {/* Section label */}
      <div
        className="body-font"
        style={{
          fontSize: "11px",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: C.accent,
          marginBottom: "24px",
        }}
      >
        CHECKOUT
      </div>

      <h1
        className="shop-font"
        style={{
          fontSize: "32px",
          fontWeight: 300,
          color: C.text,
          marginBottom: "8px",
        }}
      >
        Complete Your Order
      </h1>
      <p
        className="body-font"
        style={{
          fontSize: "14px",
          color: C.muted,
          fontWeight: 300,
          marginBottom: "36px",
        }}
      >
        Review your items then pay securely via PayFast.
      </p>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: "32px",
          alignItems: "start",
        }}
      >
        {/* Left: Order items */}
        <div>
          <div
            className="body-font"
            style={{
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: C.muted,
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            ORDER ITEMS
          </div>

          {cartItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: "14px",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              {/* Gradient swatch */}
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "2px",
                  background: `linear-gradient(135deg, ${item.gradientFrom || "#1b4332"}, ${item.gradientTo || "#2d6a4f"})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{ fontSize: "18px", color: "rgba(255,255,255,0.4)" }}
                >
                  {item.icon || "◎"}
                </span>
              </div>

              {/* Item details */}
              <div style={{ flex: 1 }}>
                <p
                  className="shop-font"
                  style={{
                    fontSize: "15px",
                    fontWeight: 400,
                    color: C.text,
                    margin: 0,
                  }}
                >
                  {item.name}
                </p>
                <span
                  className="body-font"
                  style={{ fontSize: "11px", color: C.muted }}
                >
                  Qty: {item.quantity} × R{item.price.toLocaleString()}
                </span>
              </div>

              {/* Line total */}
              <span
                className="shop-font"
                style={{ fontSize: "16px", fontWeight: 600, color: C.text }}
              >
                R{(item.price * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Right: Payment summary */}
        <div
          style={{
            background: "#f4f0e8",
            border: `1px solid ${C.border}`,
            borderRadius: "2px",
            padding: "28px",
            position: "sticky",
            top: "80px",
          }}
        >
          <div
            className="body-font"
            style={{
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: C.muted,
              fontWeight: "600",
              marginBottom: "20px",
            }}
          >
            PAYMENT SUMMARY
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span
              className="body-font"
              style={{ fontSize: "13px", color: "#666" }}
            >
              Subtotal
            </span>
            <span
              className="body-font"
              style={{ fontSize: "13px", color: C.text, fontWeight: 500 }}
            >
              R{total.toLocaleString()}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <span
              className="body-font"
              style={{ fontSize: "13px", color: "#666" }}
            >
              Shipping
            </span>
            <span
              className="body-font"
              style={{ fontSize: "13px", color: C.accent, fontWeight: 500 }}
            >
              FREE
            </span>
          </div>

          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: "16px",
              marginTop: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "24px",
            }}
          >
            <span
              className="body-font"
              style={{
                fontSize: "12px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontWeight: "600",
                color: C.text,
              }}
            >
              Total (ZAR)
            </span>
            <span
              className="shop-font"
              style={{ fontSize: "28px", color: "#2d6a4f", fontWeight: 600 }}
            >
              R{total.toLocaleString()}
            </span>
          </div>

          {/* Sandbox notice */}
          {PAYFAST_CONFIG.sandbox && (
            <div
              className="body-font"
              style={{
                background: "rgba(230,126,34,0.1)",
                border: "1px solid rgba(230,126,34,0.3)",
                borderRadius: "2px",
                padding: "10px 14px",
                fontSize: "11px",
                color: "#e67e22",
                marginBottom: "16px",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              ⚠ SANDBOX MODE — No real payments will be processed
            </div>
          )}

          {/* Pay button */}
          <button
            className="body-font"
            onClick={handlePayFast}
            disabled={submitting}
            style={{
              width: "100%",
              background: submitting ? "#888" : "#1b4332",
              color: "white",
              border: "none",
              borderRadius: "2px",
              padding: "14px 24px",
              fontSize: "12px",
              fontWeight: "600",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!submitting) e.target.style.background = "#2d6a4f";
            }}
            onMouseLeave={(e) => {
              if (!submitting) e.target.style.background = "#1b4332";
            }}
          >
            {submitting ? "Redirecting to PayFast…" : "Pay with PayFast"}
          </button>

          <p
            className="body-font"
            style={{
              fontSize: "11px",
              color: C.muted,
              textAlign: "center",
              marginTop: "14px",
              lineHeight: 1.5,
            }}
          >
            You'll be securely redirected to PayFast to complete payment.
          </p>

          {/* Back to cart link */}
          <p
            className="body-font"
            onClick={() => navigate("/cart")}
            style={{
              fontSize: "11px",
              color: "#2d6a4f",
              textAlign: "center",
              marginTop: "12px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            ← Back to Cart
          </p>
        </div>
      </div>

      {/* Hidden PayFast form — submitted via JS */}
      <form
        ref={formRef}
        action={PAYFAST_CONFIG.baseUrl}
        method="POST"
        style={{ display: "none" }}
      >
        <input
          type="hidden"
          name="merchant_id"
          value={PAYFAST_CONFIG.merchant_id}
        />
        <input
          type="hidden"
          name="merchant_key"
          value={PAYFAST_CONFIG.merchant_key}
        />
        <input
          type="hidden"
          name="return_url"
          value={`${origin}/order-success`}
        />
        <input type="hidden" name="cancel_url" value={`${origin}/cart`} />
        <input
          type="hidden"
          name="notify_url"
          value={`${origin}/api/payfast-notify`}
        />
        <input type="hidden" name="amount" value={total.toFixed(2)} />
        <input type="hidden" name="item_name" value={itemName} />
        <input
          type="hidden"
          name="item_description"
          value={`Order ${orderRef}`}
        />
        <input type="hidden" name="m_payment_id" value={orderRef} />
        {userEmail && (
          <input type="hidden" name="email_address" value={userEmail} />
        )}
      </form>

      {/* Responsive override for mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 380px"] {
            display: flex !important;
            flex-direction: column !important;
          }
        }
      `}</style>
    </>
  );
}
