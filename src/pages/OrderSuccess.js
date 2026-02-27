// src/pages/OrderSuccess.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// Post-payment confirmation page. Reads last order from localStorage.
// Rendered inside PageShell via WithNav.
// Per LL-017: no own wrapper, footer, or font import (PageShell provides).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../styles/tokens";

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("protea_last_order");
      if (raw) {
        setOrder(JSON.parse(raw));
        // Clean up — don't persist order data indefinitely
        localStorage.removeItem("protea_last_order");
      }
    } catch (e) {
      console.warn("[OrderSuccess] Could not read last order:", e);
    }
  }, []);

  return (
    <>
      <style>{`
        .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
        .body-font { font-family: 'Jost', sans-serif; }
      `}</style>

      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        {/* Success icon */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "rgba(82,183,136,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <span style={{ fontSize: "32px", color: C.accent }}>✓</span>
        </div>

        <div
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: C.accent,
            marginBottom: "12px",
          }}
        >
          ORDER CONFIRMED
        </div>

        <h1
          className="shop-font"
          style={{
            fontSize: "36px",
            fontWeight: 300,
            color: C.text,
            marginBottom: "12px",
          }}
        >
          Thank You for Your Order
        </h1>

        <p
          className="body-font"
          style={{
            fontSize: "15px",
            color: C.muted,
            fontWeight: 300,
            marginBottom: "32px",
            maxWidth: "480px",
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          Your payment has been processed successfully. You'll receive a
          confirmation email shortly with your order details.
        </p>

        {/* Order reference card */}
        {order && (
          <div
            style={{
              background: "#f4f0e8",
              border: `1px solid ${C.border}`,
              borderRadius: "2px",
              padding: "28px 32px",
              maxWidth: "440px",
              margin: "0 auto 36px",
              textAlign: "left",
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
                marginBottom: "16px",
              }}
            >
              ORDER DETAILS
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
                style={{ fontSize: "12px", color: C.muted }}
              >
                Reference
              </span>
              <span
                className="body-font"
                style={{
                  fontSize: "12px",
                  color: C.text,
                  fontWeight: 600,
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {order.ref}
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
                style={{ fontSize: "12px", color: C.muted }}
              >
                Date
              </span>
              <span
                className="body-font"
                style={{ fontSize: "12px", color: C.text }}
              >
                {new Date(order.date).toLocaleDateString("en-ZA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            {/* Item list */}
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                marginTop: "14px",
                paddingTop: "14px",
              }}
            >
              {order.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <span
                    className="body-font"
                    style={{ fontSize: "12px", color: "#666" }}
                  >
                    {item.name} × {item.qty}
                  </span>
                  <span
                    className="body-font"
                    style={{ fontSize: "12px", color: C.text, fontWeight: 500 }}
                  >
                    R{(item.price * item.qty).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                marginTop: "14px",
                paddingTop: "14px",
                display: "flex",
                justifyContent: "space-between",
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
                Total Paid
              </span>
              <span
                className="shop-font"
                style={{ fontSize: "22px", color: "#2d6a4f", fontWeight: 600 }}
              >
                R{order.total.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: "14px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="body-font"
            onClick={() => navigate("/shop")}
            style={{
              background: "#1b4332",
              color: "white",
              border: "none",
              borderRadius: "2px",
              padding: "12px 28px",
              fontSize: "11px",
              fontWeight: "600",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#2d6a4f")}
            onMouseLeave={(e) => (e.target.style.background = "#1b4332")}
          >
            Continue Shopping
          </button>
          <button
            className="body-font"
            onClick={() => navigate("/loyalty")}
            style={{
              background: "transparent",
              color: "#2d6a4f",
              border: "1px solid #2d6a4f",
              borderRadius: "2px",
              padding: "12px 28px",
              fontSize: "11px",
              fontWeight: "600",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#2d6a4f";
              e.target.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "transparent";
              e.target.style.color = "#2d6a4f";
            }}
          >
            View Loyalty Points
          </button>
        </div>
      </div>
    </>
  );
}
