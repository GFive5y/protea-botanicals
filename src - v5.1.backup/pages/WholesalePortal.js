// src/pages/WholesalePortal.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500&display=swap');
  .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font { font-family: 'Jost', sans-serif; }
  .pb-btn {
    font-family: 'Jost', sans-serif;
    padding: 12px 32px;
    background: #1b4332;
    color: white;
    border: none;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
  }
  .pb-btn:hover { background: #2d6a4f; }
  .pb-input {
    font-family: 'Jost', sans-serif;
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #ddd;
    border-radius: 2px;
    font-size: 14px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s;
  }
  .pb-input:focus { border-color: #2d6a4f; }
  .row-hover { transition: background 0.15s; }
  .row-hover:hover { background: #f4f0e8 !important; }
`;

const WHOLESALE_PRODUCTS = [
  {
    id: 1,
    name: "Premium 1ml Distillate Cart",
    sku: "PB-V01",
    unit: "Box of 10",
    price: 1500,
    moq: 2,
  },
  {
    id: 2,
    name: "Premium 2ml Vape Pen",
    sku: "PB-V02",
    unit: "Box of 10",
    price: 2400,
    moq: 2,
  },
  {
    id: 3,
    name: "CBD Wellness Drops",
    sku: "PB-W01",
    unit: "Pack of 6",
    price: 1680,
    moq: 3,
  },
  {
    id: 4,
    name: "Cannabis-Infused Gummies",
    sku: "PB-E01",
    unit: "Box of 12",
    price: 1680,
    moq: 3,
  },
  {
    id: 5,
    name: "Recovery Body Salve",
    sku: "PB-C01",
    unit: "Pack of 6",
    price: 1320,
    moq: 2,
  },
  {
    id: 6,
    name: "Terpene Blend Kit",
    sku: "PB-T01",
    unit: "Pack of 5",
    price: 2100,
    moq: 2,
  },
];

export default function WholesalePortal() {
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("order"); // order | history
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("wholesale_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  const updateCart = (id, qty) => {
    setCart((c) => ({ ...c, [id]: Math.max(0, qty) }));
  };

  const cartTotal = WHOLESALE_PRODUCTS.reduce(
    (sum, p) => sum + (cart[p.id] || 0) * p.price,
    0,
  );
  const cartItems = WHOLESALE_PRODUCTS.filter((p) => (cart[p.id] || 0) > 0);

  const handleSubmit = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("wholesale_orders").insert({
      user_id: user.id,
      items: cartItems.map((p) => ({
        sku: p.sku,
        name: p.name,
        qty: cart[p.id],
        price: p.price,
      })),
      total: cartTotal,
      status: "pending",
    });
    setCart({});
    setSuccess("Order submitted! Our team will be in touch within 24 hours.");
    fetchOrders();
    setSubmitting(false);
    setActiveTab("history");
  };

  const statusColor = {
    pending: "#b5935a",
    confirmed: "#2d6a4f",
    shipped: "#2c4a6e",
    delivered: "#555",
  };

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: "#faf9f6",
        minHeight: "100vh",
      }}
    >
      <style>{sharedStyles}</style>

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
          padding: "64px 40px",
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
          🏪 TRADE ACCOUNT
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 300,
            color: "#faf9f6",
            margin: "12px 0",
          }}
        >
          Wholesale Portal
        </h1>
        <p
          className="body-font"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "15px",
            fontWeight: 300,
          }}
        >
          Place bulk orders and manage your trade account.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: "#f4f0e8",
          borderBottom: "1px solid #e0d8cc",
          padding: "0 40px",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            display: "flex",
            gap: "0",
          }}
        >
          {[
            ["order", "Place Order"],
            ["history", "Order History"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="body-font"
              style={{
                padding: "16px 28px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === key
                    ? "2px solid #1b4332"
                    : "2px solid transparent",
                color: activeTab === key ? "#1b4332" : "#888",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontWeight: activeTab === key ? 500 : 300,
                transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px" }}
      >
        {success && (
          <div
            style={{
              background: "#e8f5e9",
              border: "1px solid #2d6a4f",
              borderRadius: "2px",
              padding: "16px 24px",
              marginBottom: "24px",
            }}
          >
            <p
              className="body-font"
              style={{ color: "#2d6a4f", fontSize: "14px" }}
            >
              ✓ {success}
            </p>
          </div>
        )}

        {activeTab === "order" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: "24px",
              alignItems: "start",
            }}
          >
            {/* Product List */}
            <div
              style={{
                background: "white",
                border: "1px solid #e8e0d4",
                borderRadius: "2px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  padding: "24px 32px",
                  borderBottom: "1px solid #e8e0d4",
                }}
              >
                <h2
                  className="shop-font"
                  style={{
                    fontSize: "24px",
                    fontWeight: 400,
                    color: "#1a1a1a",
                  }}
                >
                  Product Catalogue
                </h2>
              </div>
              {WHOLESALE_PRODUCTS.map((p, i) => (
                <div
                  key={p.id}
                  className="row-hover"
                  style={{
                    padding: "20px 32px",
                    borderBottom:
                      i < WHOLESALE_PRODUCTS.length - 1
                        ? "1px solid #f0ebe2"
                        : "none",
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: "16px",
                    alignItems: "center",
                    background: "white",
                  }}
                >
                  <div>
                    <p
                      className="shop-font"
                      style={{
                        fontSize: "18px",
                        color: "#1a1a1a",
                        fontWeight: 400,
                      }}
                    >
                      {p.name}
                    </p>
                    <p
                      className="body-font"
                      style={{
                        fontSize: "11px",
                        color: "#aaa",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {p.sku} · {p.unit} · MOQ: {p.moq}
                    </p>
                  </div>
                  <span
                    className="shop-font"
                    style={{
                      fontSize: "18px",
                      color: "#2d6a4f",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    R{p.price.toLocaleString()}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={() => updateCart(p.id, (cart[p.id] || 0) - 1)}
                      style={{
                        width: "28px",
                        height: "28px",
                        background: "#f4f0e8",
                        border: "1px solid #e0d8cc",
                        borderRadius: "2px",
                        cursor: "pointer",
                        fontSize: "16px",
                      }}
                    >
                      −
                    </button>
                    <span
                      className="body-font"
                      style={{
                        width: "28px",
                        textAlign: "center",
                        fontSize: "14px",
                      }}
                    >
                      {cart[p.id] || 0}
                    </span>
                    <button
                      onClick={() => updateCart(p.id, (cart[p.id] || 0) + 1)}
                      style={{
                        width: "28px",
                        height: "28px",
                        background: "#1b4332",
                        border: "none",
                        borderRadius: "2px",
                        cursor: "pointer",
                        color: "white",
                        fontSize: "16px",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div
              style={{
                background: "white",
                border: "1px solid #e8e0d4",
                borderRadius: "2px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                position: "sticky",
                top: "24px",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
                  padding: "24px 28px",
                }}
              >
                <h2
                  className="shop-font"
                  style={{ fontSize: "22px", fontWeight: 300, color: "white" }}
                >
                  Order Summary
                </h2>
              </div>
              <div style={{ padding: "24px 28px" }}>
                {cartItems.length === 0 ? (
                  <p
                    className="body-font"
                    style={{
                      color: "#aaa",
                      fontSize: "13px",
                      textAlign: "center",
                      padding: "24px 0",
                    }}
                  >
                    Add products to begin your order.
                  </p>
                ) : (
                  <>
                    {cartItems.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                        }}
                      >
                        <span
                          className="body-font"
                          style={{ fontSize: "13px", color: "#555" }}
                        >
                          {p.name} ×{cart[p.id]}
                        </span>
                        <span
                          className="body-font"
                          style={{
                            fontSize: "13px",
                            color: "#333",
                            fontWeight: 500,
                          }}
                        >
                          R{(cart[p.id] * p.price).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div
                      style={{
                        borderTop: "1px solid #e8e0d4",
                        paddingTop: "16px",
                        marginTop: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        className="shop-font"
                        style={{ fontSize: "18px", color: "#1a1a1a" }}
                      >
                        Total
                      </span>
                      <span
                        className="shop-font"
                        style={{
                          fontSize: "22px",
                          color: "#2d6a4f",
                          fontWeight: 600,
                        }}
                      >
                        R{cartTotal.toLocaleString()}
                      </span>
                    </div>
                    <button
                      className="pb-btn"
                      style={{ width: "100%", marginTop: "20px" }}
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit Order"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div
            style={{
              background: "white",
              border: "1px solid #e8e0d4",
              borderRadius: "2px",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                padding: "24px 32px",
                borderBottom: "1px solid #e8e0d4",
              }}
            >
              <h2
                className="shop-font"
                style={{ fontSize: "24px", fontWeight: 400, color: "#1a1a1a" }}
              >
                Order History
              </h2>
            </div>
            {orders.length === 0 ? (
              <div style={{ padding: "60px", textAlign: "center" }}>
                <div style={{ fontSize: "36px", marginBottom: "16px" }}>◎</div>
                <p className="body-font" style={{ color: "#aaa" }}>
                  No orders placed yet.
                </p>
              </div>
            ) : (
              orders.map((order, i) => (
                <div
                  key={order.id}
                  className="row-hover"
                  style={{
                    padding: "20px 32px",
                    borderBottom:
                      i < orders.length - 1 ? "1px solid #f0ebe2" : "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "white",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <p
                      className="shop-font"
                      style={{ fontSize: "17px", color: "#1a1a1a" }}
                    >
                      Order #{order.id.slice(-6).toUpperCase()}
                    </p>
                    <p
                      className="body-font"
                      style={{ fontSize: "12px", color: "#aaa" }}
                    >
                      {new Date(order.created_at).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {" · "}
                      {order.items?.length} item
                      {order.items?.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                    }}
                  >
                    <span
                      className="shop-font"
                      style={{ fontSize: "18px", color: "#2d6a4f" }}
                    >
                      R{order.total?.toLocaleString()}
                    </span>
                    <span
                      className="body-font"
                      style={{
                        fontSize: "10px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        padding: "4px 12px",
                        borderRadius: "2px",
                        background: `${statusColor[order.status] || "#888"}22`,
                        color: statusColor[order.status] || "#888",
                        border: `1px solid ${statusColor[order.status] || "#888"}44`,
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <footer
        style={{
          background: "#1a1a1a",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#faf9f6", letterSpacing: "0.2em" }}
        >
          PROTEA
        </span>
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#52b788", letterSpacing: "0.2em" }}
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
