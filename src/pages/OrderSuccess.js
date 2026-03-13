// src/pages/OrderSuccess.js — Protea Botanicals v2.1
// v2.1: WP-N — Added <ClientHeader variant="light" />, font @import restored (PageShell removed)
// ─────────────────────────────────────────────────────────────────────────────
// ★ v2.0 CHANGELOG (Phase 2G — PayFast Production Integration):
//   Reads order_ref from URL param, queries orders+order_items, polls status.
//   Falls back to localStorage. Displays loyalty points earned.
// v1.0: Read order from localStorage only, no DB validation
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { C } from "../styles/tokens";
import ClientHeader from "../components/ClientHeader";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_DURATION_MS = 60000;

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [pointsEarned, setPointsEarned] = useState(0);
  const [localFallback, setLocalFallback] = useState(null);
  const pollTimerRef = useRef(null);
  const pollStartRef = useRef(null);

  const orderRef = searchParams.get("ref");

  const fetchOrder = useCallback(async (ref) => {
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .eq("order_ref", ref)
        .single();
      if (orderErr || !orderData) return null;
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderData.id)
        .order("created_at");
      return { order: orderData, items: items || [] };
    } catch (err) {
      return null;
    }
  }, []);

  const startPolling = useCallback(
    (ref) => {
      pollStartRef.current = Date.now();
      const poll = async () => {
        const result = await fetchOrder(ref);
        if (!result) {
          setStatus("not_found");
          return;
        }
        setOrder(result.order);
        setOrderItems(result.items);
        if (result.order.status === "paid") {
          setStatus("paid");
          setPointsEarned(Math.floor(result.order.total / 100));
          try {
            localStorage.removeItem("protea_last_order");
          } catch (_e) {}
          return;
        }
        if (
          result.order.status === "failed" ||
          result.order.status === "cancelled"
        ) {
          setStatus("failed");
          return;
        }
        const elapsed = Date.now() - pollStartRef.current;
        if (elapsed >= POLL_MAX_DURATION_MS) {
          setStatus("timeout");
          setPointsEarned(Math.floor(result.order.total / 100));
          return;
        }
        setStatus("verifying");
        pollTimerRef.current = setTimeout(() => poll(), POLL_INTERVAL_MS);
      };
      poll();
    },
    [fetchOrder],
  );

  useEffect(() => {
    if (orderRef) {
      startPolling(orderRef);
    } else {
      try {
        const raw = localStorage.getItem("protea_last_order");
        if (raw) {
          const parsed = JSON.parse(raw);
          setLocalFallback(parsed);
          localStorage.removeItem("protea_last_order");
          if (parsed.ref) {
            startPolling(parsed.ref);
          } else {
            setStatus("paid");
          }
        } else {
          setStatus("not_found");
        }
      } catch (e) {
        setStatus("not_found");
      }
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [orderRef, startPolling]);

  const displayOrder = order
    ? {
        ref: order.order_ref,
        total: parseFloat(order.total),
        date: order.created_at,
        items: orderItems.map((i) => ({
          name: i.product_name,
          qty: i.quantity,
          price: parseFloat(i.unit_price),
        })),
      }
    : localFallback;

  return (
    <>
      <ClientHeader variant="light" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500;600&display=swap');
        .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
        .body-font { font-family: 'Jost', sans-serif; }
        @keyframes protea-spin { to { transform: rotate(360deg); } }
        @keyframes protea-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        {/* Loading */}
        {status === "loading" && (
          <>
            <div
              style={{
                width: "48px",
                height: "48px",
                border: "3px solid #e0dbd2",
                borderTopColor: "#1b4332",
                borderRadius: "50%",
                animation: "protea-spin 0.8s linear infinite",
                margin: "0 auto 24px",
              }}
            />
            <p
              className="body-font"
              style={{ fontSize: "13px", color: C.muted }}
            >
              Loading your order…
            </p>
          </>
        )}

        {/* Verifying */}
        {status === "verifying" && (
          <>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(181,147,90,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                animation: "protea-pulse 2s ease-in-out infinite",
              }}
            >
              <span style={{ fontSize: "32px" }}>⏳</span>
            </div>
            <div
              className="body-font"
              style={{
                fontSize: "11px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: C.gold,
                marginBottom: "12px",
              }}
            >
              VERIFYING PAYMENT
            </div>
            <h1
              className="shop-font"
              style={{
                fontSize: "32px",
                fontWeight: 300,
                color: C.text,
                marginBottom: "12px",
              }}
            >
              Processing Your Payment
            </h1>
            <p
              className="body-font"
              style={{
                fontSize: "14px",
                color: C.muted,
                fontWeight: 300,
                maxWidth: "480px",
                margin: "0 auto 24px",
                lineHeight: 1.6,
              }}
            >
              We're confirming your payment with PayFast. This usually takes a
              few seconds…
            </p>
            <div
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid #e0dbd2",
                borderTopColor: C.gold,
                borderRadius: "50%",
                animation: "protea-spin 0.8s linear infinite",
                margin: "0 auto",
              }}
            />
          </>
        )}

        {/* Paid / Timeout */}
        {(status === "paid" || status === "timeout") && (
          <>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background:
                  status === "paid"
                    ? "rgba(82,183,136,0.12)"
                    : "rgba(181,147,90,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <span
                style={{
                  fontSize: "32px",
                  color: status === "paid" ? C.accent : C.gold,
                }}
              >
                {status === "paid" ? "✓" : "⏳"}
              </span>
            </div>
            <div
              className="body-font"
              style={{
                fontSize: "11px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: status === "paid" ? C.accent : C.gold,
                marginBottom: "12px",
              }}
            >
              {status === "paid" ? "ORDER CONFIRMED" : "ORDER RECEIVED"}
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
              {status === "paid"
                ? "Thank You for Your Order"
                : "Order Submitted Successfully"}
            </h1>
            <p
              className="body-font"
              style={{
                fontSize: "15px",
                color: C.muted,
                fontWeight: 300,
                maxWidth: "480px",
                margin: "0 auto 32px",
                lineHeight: 1.6,
              }}
            >
              {status === "paid"
                ? "Your payment has been confirmed. You'll receive a confirmation email shortly."
                : "Your payment is being verified by PayFast. You'll receive a confirmation email once complete."}
            </p>

            {pointsEarned > 0 && (
              <div
                className="body-font"
                style={{
                  background: "rgba(82,183,136,0.08)",
                  border: "1px solid rgba(82,183,136,0.2)",
                  borderRadius: "2px",
                  padding: "14px 24px",
                  maxWidth: "360px",
                  margin: "0 auto 32px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: C.accent,
                    marginBottom: "6px",
                    fontWeight: 600,
                  }}
                >
                  LOYALTY REWARD
                </div>
                <div
                  className="shop-font"
                  style={{
                    fontSize: "28px",
                    fontWeight: 600,
                    color: "#2d6a4f",
                  }}
                >
                  +{pointsEarned} point{pointsEarned !== 1 ? "s" : ""}
                </div>
                <div
                  style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}
                >
                  {status === "paid"
                    ? "Added to your loyalty balance"
                    : "Will be added once payment confirms"}
                </div>
              </div>
            )}

            {displayOrder && (
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

                {[
                  [
                    "Reference",
                    <span
                      style={{
                        fontFamily: "monospace",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {displayOrder.ref}
                    </span>,
                  ],
                  [
                    "Date",
                    new Date(displayOrder.date).toLocaleDateString("en-ZA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  ],
                ].map(([label, val]) => (
                  <div
                    key={label}
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
                      {label}
                    </span>
                    <span
                      className="body-font"
                      style={{
                        fontSize: "12px",
                        color: C.text,
                        fontWeight: 600,
                      }}
                    >
                      {val}
                    </span>
                  </div>
                ))}

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
                    Status
                  </span>
                  <span
                    className="body-font"
                    style={{
                      fontSize: "10px",
                      padding: "2px 10px",
                      borderRadius: "2px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      background:
                        status === "paid"
                          ? "rgba(82,183,136,0.15)"
                          : "rgba(181,147,90,0.15)",
                      color: status === "paid" ? C.accent : C.gold,
                    }}
                  >
                    {status === "paid" ? "Paid ✓" : "Pending"}
                  </span>
                </div>

                {displayOrder.items && displayOrder.items.length > 0 && (
                  <div
                    style={{
                      borderTop: `1px solid ${C.border}`,
                      marginTop: "14px",
                      paddingTop: "14px",
                    }}
                  >
                    {displayOrder.items.map((item, i) => (
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
                          style={{
                            fontSize: "12px",
                            color: C.text,
                            fontWeight: 500,
                          }}
                        >
                          R{(item.price * item.qty).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

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
                    R{displayOrder.total.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

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
          </>
        )}

        {/* Failed */}
        {status === "failed" && (
          <>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(192,57,43,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <span style={{ fontSize: "32px", color: "#c0392b" }}>✕</span>
            </div>
            <div
              className="body-font"
              style={{
                fontSize: "11px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#c0392b",
                marginBottom: "12px",
              }}
            >
              PAYMENT FAILED
            </div>
            <h1
              className="shop-font"
              style={{
                fontSize: "32px",
                fontWeight: 300,
                color: C.text,
                marginBottom: "12px",
              }}
            >
              Payment Could Not Be Processed
            </h1>
            <p
              className="body-font"
              style={{
                fontSize: "14px",
                color: C.muted,
                fontWeight: 300,
                maxWidth: "480px",
                margin: "0 auto 32px",
                lineHeight: 1.6,
              }}
            >
              Unfortunately your payment was not successful. No charges have
              been made. Please try again.
            </p>
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
              }}
            >
              Return to Shop
            </button>
          </>
        )}

        {/* Not Found */}
        {status === "not_found" && (
          <>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(136,136,136,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <span style={{ fontSize: "32px", color: C.muted }}>?</span>
            </div>
            <h1
              className="shop-font"
              style={{
                fontSize: "28px",
                fontWeight: 300,
                color: C.text,
                marginBottom: "12px",
              }}
            >
              No Order Found
            </h1>
            <p
              className="body-font"
              style={{
                fontSize: "14px",
                color: C.muted,
                fontWeight: 300,
                maxWidth: "480px",
                margin: "0 auto 32px",
                lineHeight: 1.6,
              }}
            >
              We couldn't find an order to display. If you just completed a
              payment, please check your email for confirmation.
            </p>
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
              }}
            >
              Go to Shop
            </button>
          </>
        )}
      </div>
    </>
  );
}
