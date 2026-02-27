// src/pages/CartPage.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// Full cart view with item list, quantity controls, subtotals, cart total,
// "Proceed to Checkout" button, empty cart state. Matches Protea aesthetic.
// No PageShell wrapper (like /shop — has full-bleed hero).
// ─────────────────────────────────────────────────────────────────────────────

import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } =
    useCart();
  const navigate = useNavigate();
  const total = getCartTotal();

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: "#faf9f6",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500;600&display=swap');
        .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
        .body-font { font-family: 'Jost', sans-serif; }
        .qty-btn { transition: all 0.15s; }
        .qty-btn:hover { background: #2d6a4f !important; color: white !important; }
        .remove-btn { transition: all 0.15s; }
        .remove-btn:hover { color: #c0392b !important; }
      `}</style>

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
          padding: "48px 40px",
          textAlign: "center",
        }}
      >
        <span
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#52b788",
          }}
        >
          YOUR SELECTION
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 300,
            color: "#faf9f6",
            margin: "12px 0 0",
          }}
        >
          Shopping Cart
        </h1>
      </div>

      {/* Cart content */}
      <div
        style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}
      >
        {cartItems.length === 0 ? (
          /* ── Empty cart state ── */
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div
              style={{
                fontSize: "56px",
                marginBottom: "20px",
                opacity: 0.3,
              }}
            >
              ◎
            </div>
            <h2
              className="shop-font"
              style={{
                fontSize: "28px",
                fontWeight: 300,
                color: "#1a1a1a",
                marginBottom: "12px",
              }}
            >
              Your cart is empty
            </h2>
            <p
              className="body-font"
              style={{
                fontSize: "14px",
                color: "#888",
                fontWeight: 300,
                marginBottom: "32px",
              }}
            >
              Browse our premium selection and add products to your cart.
            </p>
            <button
              className="body-font"
              onClick={() => navigate("/shop")}
              style={{
                background: "#1b4332",
                color: "white",
                border: "none",
                borderRadius: "2px",
                padding: "12px 32px",
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
          </div>
        ) : (
          <>
            {/* ── Cart items ── */}
            <div style={{ marginBottom: "32px" }}>
              {/* Header row — desktop only */}
              <div
                className="body-font"
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                  gap: "16px",
                  padding: "0 0 12px",
                  borderBottom: "1px solid #e0dbd2",
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#888",
                  fontWeight: "600",
                }}
              >
                <span>Product</span>
                <span style={{ textAlign: "center" }}>Price</span>
                <span style={{ textAlign: "center" }}>Quantity</span>
                <span style={{ textAlign: "right" }}>Subtotal</span>
                <span style={{ width: "32px" }}></span>
              </div>

              {/* Cart item rows */}
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                    gap: "16px",
                    alignItems: "center",
                    padding: "20px 0",
                    borderBottom: "1px solid #f0ece4",
                  }}
                >
                  {/* Product info */}
                  <div
                    style={{
                      display: "flex",
                      gap: "14px",
                      alignItems: "center",
                    }}
                  >
                    {/* Strain gradient swatch */}
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "2px",
                        background: `linear-gradient(135deg, ${item.gradientFrom || "#1b4332"}, ${item.gradientTo || "#2d6a4f"})`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "20px",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        {item.icon || "◎"}
                      </span>
                    </div>
                    <div>
                      {item.line && (
                        <p
                          className="body-font"
                          style={{
                            fontSize: "9px",
                            letterSpacing: "0.2em",
                            color: "#bbb",
                            textTransform: "uppercase",
                            margin: "0 0 3px",
                          }}
                        >
                          {item.line}
                        </p>
                      )}
                      <p
                        className="shop-font"
                        style={{
                          fontSize: "17px",
                          fontWeight: 400,
                          color: "#1a1a1a",
                          margin: 0,
                        }}
                      >
                        {item.name}
                      </p>
                      {item.type && (
                        <span
                          className="body-font"
                          style={{
                            fontSize: "9px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: item.typeColor || "#888",
                          }}
                        >
                          {item.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unit price */}
                  <span
                    className="shop-font"
                    style={{
                      fontSize: "17px",
                      color: "#2d6a4f",
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    R{item.price.toLocaleString()}
                  </span>

                  {/* Quantity controls */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0",
                    }}
                  >
                    <button
                      className="qty-btn body-font"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      style={{
                        width: "30px",
                        height: "30px",
                        background: "#f4f0e8",
                        border: "1px solid #e0dbd2",
                        borderRadius: "2px 0 0 2px",
                        fontSize: "14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#1a1a1a",
                      }}
                    >
                      −
                    </button>
                    <span
                      className="body-font"
                      style={{
                        width: "36px",
                        height: "30px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #e0dbd2",
                        borderLeft: "none",
                        borderRight: "none",
                        fontSize: "13px",
                        fontWeight: "500",
                        background: "#fff",
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      className="qty-btn body-font"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      style={{
                        width: "30px",
                        height: "30px",
                        background: "#f4f0e8",
                        border: "1px solid #e0dbd2",
                        borderRadius: "0 2px 2px 0",
                        fontSize: "14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#1a1a1a",
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Line subtotal */}
                  <span
                    className="shop-font"
                    style={{
                      fontSize: "17px",
                      color: "#1a1a1a",
                      fontWeight: 600,
                      textAlign: "right",
                    }}
                  >
                    R{(item.price * item.quantity).toLocaleString()}
                  </span>

                  {/* Remove button */}
                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                      color: "#ccc",
                      padding: "4px",
                      width: "32px",
                      textAlign: "center",
                    }}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* ── Cart summary ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "24px",
              }}
            >
              {/* Left: action buttons */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  className="body-font"
                  onClick={() => navigate("/shop")}
                  style={{
                    background: "transparent",
                    color: "#2d6a4f",
                    border: "1px solid #2d6a4f",
                    borderRadius: "2px",
                    padding: "10px 24px",
                    fontSize: "11px",
                    fontWeight: "600",
                    letterSpacing: "0.15em",
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
                  Continue Shopping
                </button>
                <button
                  className="body-font"
                  onClick={clearCart}
                  style={{
                    background: "transparent",
                    color: "#888",
                    border: "1px solid #e0dbd2",
                    borderRadius: "2px",
                    padding: "10px 20px",
                    fontSize: "11px",
                    fontWeight: "600",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = "#c0392b";
                    e.target.style.color = "#c0392b";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = "#e0dbd2";
                    e.target.style.color = "#888";
                  }}
                >
                  Clear Cart
                </button>
              </div>

              {/* Right: totals + checkout */}
              <div
                style={{
                  background: "#f4f0e8",
                  border: "1px solid #e0dbd2",
                  borderRadius: "2px",
                  padding: "28px 32px",
                  minWidth: "280px",
                }}
              >
                <div
                  className="body-font"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "#888",
                    fontWeight: "600",
                    marginBottom: "16px",
                  }}
                >
                  Order Summary
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    className="body-font"
                    style={{ fontSize: "13px", color: "#666" }}
                  >
                    Subtotal ({cartItems.reduce((s, i) => s + i.quantity, 0)}{" "}
                    items)
                  </span>
                  <span
                    className="shop-font"
                    style={{
                      fontSize: "16px",
                      color: "#1a1a1a",
                      fontWeight: 600,
                    }}
                  >
                    R{total.toLocaleString()}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "16px",
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
                    style={{
                      fontSize: "13px",
                      color: "#52b788",
                      fontWeight: 500,
                    }}
                  >
                    Calculated at checkout
                  </span>
                </div>

                <div
                  style={{
                    borderTop: "1px solid #e0dbd2",
                    paddingTop: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "20px",
                  }}
                >
                  <span
                    className="body-font"
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      fontWeight: "600",
                      color: "#1a1a1a",
                    }}
                  >
                    Total
                  </span>
                  <span
                    className="shop-font"
                    style={{
                      fontSize: "26px",
                      color: "#2d6a4f",
                      fontWeight: 600,
                    }}
                  >
                    R{total.toLocaleString()}
                  </span>
                </div>

                <button
                  className="body-font"
                  onClick={() => navigate("/checkout")}
                  style={{
                    width: "100%",
                    background: "#1b4332",
                    color: "white",
                    border: "none",
                    borderRadius: "2px",
                    padding: "13px 24px",
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
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer
        style={{
          background: "#1a1a1a",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <span
          className="shop-font"
          style={{
            fontSize: "18px",
            color: "#faf9f6",
            letterSpacing: "0.2em",
          }}
        >
          PROTEA
        </span>
        <span
          className="shop-font"
          style={{
            fontSize: "18px",
            color: "#52b788",
            letterSpacing: "0.2em",
          }}
        >
          {" "}
          BOTANICALS
        </span>
        <p
          className="body-font"
          onClick={() => navigate("/")}
          style={{
            fontSize: "11px",
            color: "#555",
            marginTop: "12px",
            cursor: "pointer",
          }}
        >
          ← Back to Home
        </p>
      </footer>
    </div>
  );
}
