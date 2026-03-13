// src/pages/CheckoutPage.js — Protea Botanicals v2.2
// v2.2: WP-N — Added <ClientHeader variant="light" />, font @import restored (PageShell removed)
// ─────────────────────────────────────────────────────────────────────────────
// ★ v2.1 CHANGELOG (Task A-5 — Automation WP):
//   ADD: After order is created via edge function, loop through cart items
//        and deduct from inventory_items + create stock_movements (sale_out).
// ★ v2.0 CHANGELOG (Phase 2G — PayFast Production Integration):
//   Calls payfast-checkout Edge Function for server-side order + MD5 signature.
// v1.0: Mock checkout with hardcoded sandbox form POST
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { RoleContext } from "../App";
import { supabase } from "../services/supabaseClient";
import { C } from "../styles/tokens";
import ClientHeader from "../components/ClientHeader";

const HQ_TENANT_ID = "43b34c33-6864-4f02-98dd-df1d340475c3";

export default function CheckoutPage() {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { userEmail } = useContext(RoleContext);
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);
  const [payfastUrl, setPayfastUrl] = useState(null);

  const total = getCartTotal();

  useEffect(() => {
    if (cartItems.length === 0 && !submitting && !formData) {
      navigate("/cart", { replace: true });
    }
  }, [cartItems, navigate, submitting, formData]);

  useEffect(() => {
    if (formData && formRef.current) {
      console.log("[Checkout] Auto-submitting signed form to PayFast");
      try {
        localStorage.removeItem("protea_cart");
      } catch (e) {}
      formRef.current.submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const handlePayFast = async () => {
    setSubmitting(true);
    setError(null);

    try {
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
      const deductionErrors = [];
      let deductedCount = 0;

      for (const item of cartItems) {
        const qty = item.quantity || 0;
        if (!item.inventory_item_id || qty <= 0) continue;

        try {
          const { data: invItem, error: readErr } = await supabase
            .from("inventory_items")
            .select("quantity_on_hand")
            .eq("id", item.inventory_item_id)
            .single();

          if (readErr) {
            deductionErrors.push(`${item.name} (read): ${readErr.message}`);
            continue;
          }

          const newQty = (invItem.quantity_on_hand || 0) - qty;
          const { error: updErr } = await supabase
            .from("inventory_items")
            .update({ quantity_on_hand: newQty })
            .eq("id", item.inventory_item_id);

          if (updErr) {
            deductionErrors.push(`${item.name} (update): ${updErr.message}`);
            continue;
          }

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
            deductionErrors.push(`${item.name} (movement): ${moveErr.message}`);
          }
          deductedCount++;
        } catch (itemErr) {
          deductionErrors.push(
            `${item.name}: ${itemErr.message || "Unknown error"}`,
          );
        }
      }

      setPayfastUrl(result.payfast_url);
      setFormData(result.form_data);
    } catch (err) {
      console.error("[Checkout] Error:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0 && !submitting && !formData) return null;

  return (
    <>
      <ClientHeader variant="light" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500;600&display=swap');
        .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
        .body-font { font-family: 'Jost', sans-serif; }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
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

        <style>{`
          @media (max-width: 768px) {
            div[style*="grid-template-columns: 1fr 380px"] {
              display: flex !important;
              flex-direction: column !important;
            }
          }
        `}</style>
      </div>
    </>
  );
}
