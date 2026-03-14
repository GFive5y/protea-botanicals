// src/pages/CheckoutPage.js — Protea Botanicals v2.1
// ─────────────────────────────────────────────────────────────────────────────
// ★ v2.1 CHANGELOG (Task A-5 — Automation WP):
//   ADD: After order is created via edge function, loop through cart items
//        and deduct from inventory_items + create stock_movements (sale_out).
//        Only items with inventory_item_id are deducted (Shop.js v2.8 provides
//        this field for live inventory items). Errors are non-blocking.
//   KEEP: Everything else identical to v2.0.
//
// ★ v2.0 CHANGELOG (Phase 2G — PayFast Production Integration):
//   1. REMOVE: Hardcoded PayFast sandbox credentials
//   2. ADD: Calls payfast-checkout Edge Function for server-side:
//      - Order creation in DB (orders + order_items tables)
//      - MD5 signature generation (passphrase kept server-side)
//      - Returns signed form data for PayFast redirect
//   3. ADD: Error handling with user-facing error states
//   4. ADD: Order reference stored in localStorage AND URL param
//   5. ADD: Supabase auth token sent to edge function
//   6. KEEP: Same visual design, same cart integration, same layout
//
// v1.0: Mock checkout with hardcoded sandbox form POST
// ─────────────────────────────────────────────────────────────────────────────
// Checkout page with order summary and PayFast payment redirect.
// Rendered inside PageShell via WithNav + RequireAuth.
// Per LL-017: no own wrapper, footer, or font import (PageShell provides).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { RoleContext } from "../App";
import { supabase } from "../services/supabaseClient";
import { C } from "../styles/tokens";

// HQ tenant ID for stock movements (LL-046, same as Production.js / Distribution.js)
const HQ_TENANT_ID = "43b34c33-6864-4f02-98dd-df1d340475c3";

// Edge function called via supabase.functions.invoke() — handles auth automatically

export default function CheckoutPage() {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { userEmail } = useContext(RoleContext);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null); // Signed PayFast form fields
  const [payfastUrl, setPayfastUrl] = useState(null);

  const total = getCartTotal();

  // Redirect to cart if empty (and not mid-submit)
  useEffect(() => {
    if (cartItems.length === 0 && !submitting && !formData) {
      navigate("/cart", { replace: true });
    }
  }, [cartItems, navigate, submitting, formData]);

  // Auto-submit form once we have signed data from edge function
  useEffect(() => {
    if (formData && formRef.current) {
      console.log("[Checkout] Auto-submitting signed form to PayFast");
      clearCart();
      formRef.current.submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // ── Handle PayFast checkout via Edge Function ─────────────────────────────
  const handlePayFast = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // Get current auth session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "You must be logged in to checkout. Please sign in and try again.",
        );
        setSubmitting(false);
        return;
      }

      console.log("[Checkout] Calling payfast-checkout edge function...");

      const { data: result, error: fnError } = await supabase.functions.invoke(
        "payfast-checkout",
        {
          body: {
            items: cartItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              gradientFrom: item.gradientFrom,
              gradientTo: item.gradientTo,
              icon: item.icon,
            })),
            total: total,
            user_email: userEmail || session.user?.email || "",
            origin_url: window.location.origin,
          },
        },
      );

      if (fnError || !result?.success) {
        throw new Error(
          result?.error ||
            fnError?.message ||
            "Checkout failed. Please try again.",
        );
      }

      console.log("[Checkout] Order created:", result.order_ref);

      // Store order reference for success page (belt-and-braces with URL param)
      try {
        localStorage.setItem(
          "protea_last_order",
          JSON.stringify({
            ref: result.order_ref,
            order_id: result.order_id,
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

      // ── TASK A-5: Deduct inventory on order creation ───────────
      // After order is created in DB, deduct from inventory and
      // create stock_movements (sale_out). Non-blocking — if this
      // fails, the order still proceeds to PayFast.
      console.log("[Checkout] A-5: Deducting inventory for order", result.order_ref);
      const deductionErrors = [];
      let deductedCount = 0;

      for (const item of cartItems) {
        const qty = item.quantity || 0;
        if (!item.inventory_item_id || qty <= 0) {
          console.log(
            `[Checkout] A-5: Skipping "${item.name}" (no inventory_item_id)`,
          );
          continue;
        }

        try {
          // Read current quantity
          const { data: invItem, error: readErr } = await supabase
            .from("inventory_items")
            .select("quantity_on_hand")
            .eq("id", item.inventory_item_id)
            .single();

          if (readErr) {
            console.error(
              `[Checkout] A-5: Read error for "${item.name}":`,
              readErr,
            );
            deductionErrors.push(`${item.name} (read): ${readErr.message}`);
            continue;
          }

          // Subtract quantity (allows negative per DEC-020)
          const newQty = (invItem.quantity_on_hand || 0) - qty;
          const { error: updErr } = await supabase
            .from("inventory_items")
            .update({ quantity_on_hand: newQty })
            .eq("id", item.inventory_item_id);

          if (updErr) {
            console.error(
              `[Checkout] A-5: Update error for "${item.name}":`,
              updErr,
            );
            deductionErrors.push(`${item.name} (update): ${updErr.message}`);
            continue;
          }

          console.log(
            `[Checkout] A-5: ✓ Deducted ${qty} of "${item.name}" → ${newQty} remaining`,
          );

          // Create stock movement record (sale_out)
          const { error: moveErr } = await supabase
            .from("stock_movements")
            .insert({
              id: crypto.randomUUID(),
              item_id: item.inventory_item_id,
              quantity: -qty,
              movement_type: "sale_out",
              reference: result.order_ref,
              notes: `Customer order ${result.order_ref}: ${qty} × ${item.name}`,
              tenant_id: HQ_TENANT_ID,
            });

          if (moveErr) {
            console.error(
              `[Checkout] A-5: Stock movement error for "${item.name}":`,
              moveErr,
            );
            deductionErrors.push(`${item.name} (movement): ${moveErr.message}`);
          }

          deductedCount++;
        } catch (itemErr) {
          console.error(
            `[Checkout] A-5: Unexpected error for "${item.name}":`,
            itemErr,
          );
          deductionErrors.push(
            `${item.name}: ${itemErr.message || "Unknown error"}`,
          );
        }
      }

      // Report results (non-blocking — order proceeds regardless)
      if (deductionErrors.length > 0) {
        console.warn("[Checkout] A-5: Some deductions failed:", deductionErrors);
      } else if (deductedCount > 0) {
        console.log(
          `[Checkout] A-5: ✓ All ${deductedCount} items deducted for order ${result.order_ref}`,
        );
      } else {
        console.log("[Checkout] A-5: No inventory items to deduct");
      }

      // Set form data — triggers auto-submit via useEffect
      setPayfastUrl(result.payfast_url);
      setFormData(result.form_data);
    } catch (err) {
      console.error("[Checkout] Error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0 && !submitting && !formData) {
    return null; // useEffect will redirect
  }

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

      {/* Error banner */}
      {error && (
        <div
          className="body-font"
          style={{
            background: "rgba(192,57,43,0.08)",
            border: "1px solid rgba(192,57,43,0.25)",
            borderRadius: "2px",
            padding: "14px 18px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "13px", color: "#c0392b" }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#c0392b",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 0 0 12px",
            }}
          >
            ✕
          </button>
        </div>
      )}

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

          {/* Loyalty points hint */}
          <div
            className="body-font"
            style={{
              background: "rgba(82,183,136,0.08)",
              border: "1px solid rgba(82,183,136,0.2)",
              borderRadius: "2px",
              padding: "10px 14px",
              fontSize: "11px",
              color: "#2d6a4f",
              marginBottom: "16px",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            🌿 You'll earn <strong>{Math.floor(total / 100)}</strong> loyalty
            point{Math.floor(total / 100) !== 1 ? "s" : ""} with this purchase
          </div>

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
            {submitting ? "Processing…" : "Pay with PayFast"}
          </button>

          {/* Submitting state detail */}
          {submitting && (
            <div
              className="body-font"
              style={{
                textAlign: "center",
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid #e0dbd2",
                  borderTopColor: "#1b4332",
                  borderRadius: "50%",
                  animation: "protea-spin 0.8s linear infinite",
                }}
              />
              <style>{`@keyframes protea-spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ fontSize: "11px", color: C.muted }}>
                Creating your order & redirecting to PayFast…
              </span>
            </div>
          )}

          {!submitting && (
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
          )}

          {/* Secure payment badges */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              marginTop: "16px",
              opacity: 0.5,
            }}
          >
            <span
              className="body-font"
              style={{
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.muted,
              }}
            >
              🔒 SSL Secured
            </span>
            <span
              className="body-font"
              style={{
                fontSize: "9px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: C.muted,
              }}
            >
              Visa · Mastercard · EFT
            </span>
          </div>

          {/* Back to cart link */}
          {!submitting && (
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
          )}
        </div>
      </div>

      {/* Hidden PayFast form — populated by edge function, submitted via useEffect */}
      {formData && payfastUrl && (
        <form
          ref={formRef}
          action={payfastUrl}
          method="POST"
          style={{ display: "none" }}
        >
          {Object.entries(formData).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}

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
