// src/pages/CheckoutPage.js v2.3
// Protea Botanicals — WP-O: loyalty_config integration + referral code field
// v2.3 changes from v2.2:
//   - Fetches loyalty_config on mount
//   - Points preview: (total/100) × pts_per_r100_online × online_bonus_pct × tier_mult
//   - Shows breakdown: "Base X pts + Online bonus + Gold tier 1.5× = Y pts total"
//   - Referral code input: validates against referral_codes table
//   - Stores validated referral code in localStorage for OrderSuccess to award
//   All v2.2 PayFast + inventory deduction logic preserved exactly

import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { RoleContext } from "../App";
import { supabase } from "../services/supabaseClient";
import { C } from "../styles/tokens";
import ClientHeader from "../components/ClientHeader";
import { useStorefront } from "../contexts/StorefrontContext"; // ✦ WP-MULTISITE

// ✦ WP-MULTISITE: tenant ID resolved from domain via StorefrontContext

const DEFAULT_CONFIG = {
  pts_per_r100_online: 2.0,
  online_bonus_pct: 50.0,
  mult_bronze: 1.0,
  mult_silver: 1.25,
  mult_gold: 1.5,
  mult_platinum: 2.0,
  threshold_silver: 200,
  threshold_gold: 500,
  threshold_platinum: 1000,
  pts_referral_referrer: 100,
  pts_referral_referee: 50,
  referral_min_order_zar: 100,
};

function getTierLabel(pts, cfg) {
  if (pts >= cfg.threshold_platinum) return "Platinum";
  if (pts >= cfg.threshold_gold) return "Gold";
  if (pts >= cfg.threshold_silver) return "Silver";
  return "Bronze";
}
function getTierMult(tier, cfg) {
  return (
    {
      Bronze: cfg.mult_bronze,
      Silver: cfg.mult_silver,
      Gold: cfg.mult_gold,
      Platinum: cfg.mult_platinum,
    }[tier] || 1.0
  );
}

export default function CheckoutPage() {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { userEmail } = useContext(RoleContext);
  const { storefrontTenantId } = useStorefront(); // ✦ WP-MULTISITE
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);
  const [payfastUrl, setPayfastUrl] = useState(null);

  // WP-O: loyalty config + user tier
  const [loyaltyConfig, setLoyaltyConfig] = useState(DEFAULT_CONFIG);
  const [userPoints, setUserPoints] = useState(0);
  const [referralInput, setReferralInput] = useState("");
  const [referralValid, setReferralValid] = useState(null); // null | "valid" | "invalid"
  const [referralChecking, setReferralChecking] = useState(false);
  const [referralOwnerPts, setReferralOwnerPts] = useState(0);

  const total = getCartTotal();

  // Compute loyalty points preview (config-driven)
  const userTier = getTierLabel(userPoints, loyaltyConfig);
  const tierMult = getTierMult(userTier, loyaltyConfig);
  const basePts = (total / 100) * loyaltyConfig.pts_per_r100_online;
  const withBonus = basePts * (1 + loyaltyConfig.online_bonus_pct / 100);
  const finalPts = Math.round(withBonus * tierMult);

  useEffect(() => {
    // Fetch loyalty config and user profile in parallel
    async function loadLoyaltyData() {
      const [cfgRes, sessionRes] = await Promise.all([
        supabase.from("loyalty_config").select("*").single(),
        supabase.auth.getSession(),
      ]);
      if (cfgRes.data) setLoyaltyConfig(cfgRes.data);
      const userId = sessionRes.data?.session?.user?.id;
      if (userId) {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("loyalty_points")
          .eq("id", userId)
          .single();
        if (prof) setUserPoints(prof.loyalty_points || 0);
      }
    }
    loadLoyaltyData();
  }, []);

  useEffect(() => {
    if (cartItems.length === 0 && !submitting && !formData) {
      navigate("/cart", { replace: true });
    }
  }, [cartItems, navigate, submitting, formData]);

  useEffect(() => {
    if (formData && formRef.current) {
      try {
        localStorage.removeItem("protea_cart");
      } catch (_) {}
      formRef.current.submit();
    }
  }, [formData]);

  // Validate referral code (debounced)
  useEffect(() => {
    if (!referralInput.trim()) {
      setReferralValid(null);
      return;
    }
    const timer = setTimeout(async () => {
      setReferralChecking(true);
      const cleanCode = referralInput.trim().toUpperCase().replace(/\s/g, "");
      // maybeSingle() returns null data (not error) when 0 rows — safer than single()
      const { data, error } = await supabase
        .from("referral_codes")
        .select("code, owner_id, uses_count")
        .eq("code", cleanCode)
        .eq("is_active", true)
        .maybeSingle();
      if (error) {
        console.error(
          "[Checkout] referral code lookup error:",
          error.code,
          error.message,
        );
      }
      console.log(
        "[Checkout] referral lookup →",
        cleanCode,
        "→ data:",
        data,
        "error:",
        error?.code,
      );
      setReferralValid(data ? "valid" : "invalid");
      setReferralOwnerPts(data ? loyaltyConfig.pts_referral_referrer : 0);
      setReferralChecking(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [referralInput, loyaltyConfig.pts_referral_referrer]);

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

      // Store referral code for OrderSuccess to process
      if (referralValid === "valid" && referralInput.trim()) {
        const cleanCode = referralInput.trim().toUpperCase().replace(/\s/g, "");
        try {
          localStorage.setItem("protea_referral_code", cleanCode);
        } catch (_) {}
      } else {
        try {
          localStorage.removeItem("protea_referral_code");
        } catch (_) {}
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
            total,
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
            loyalty_pts_pending: finalPts,
          }),
        );
      } catch (_) {}

      // Task A-5: Deduct inventory
      for (const item of cartItems) {
        const qty = item.quantity || 0;
        if (!item.inventory_item_id || qty <= 0) continue;
        try {
          const { data: invItem } = await supabase
            .from("inventory_items")
            .select("quantity_on_hand, reserved_qty")
            .eq("id", item.inventory_item_id)
            .single();
          if (!invItem) continue;
          const availQty =
            (invItem.quantity_on_hand || 0) - (invItem.reserved_qty || 0);
          if (availQty < qty) {
            console.warn(
              `Checkout oversell guard: ${item.name} — available: ${availQty}, requested: ${qty}`,
            );
            continue;
          }
          await supabase
            .from("inventory_items")
            .update({ quantity_on_hand: (invItem.quantity_on_hand || 0) - qty })
            .eq("id", item.inventory_item_id)
            .gte("quantity_on_hand", qty);
          await supabase.from("stock_movements").insert({
            id: crypto.randomUUID(),
            item_id: item.inventory_item_id,
            quantity: -qty,
            movement_type: "sale_out",
            unit_cost: item.price || 0,
            reference: result.order_ref,
            notes: `Customer order ${result.order_ref}: ${qty} × ${item.name}`,
            tenant_id: storefrontTenantId,
          });
        } catch (_) {}
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

  const showBonus = loyaltyConfig.online_bonus_pct > 0;
  const showTierBonus = tierMult > 1;

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

            {/* WP-O: Config-driven points preview */}
            <div
              className="body-font"
              style={{
                background: "rgba(82,183,136,0.08)",
                border: "1px solid rgba(82,183,136,0.25)",
                borderRadius: "2px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#2d6a4f",
                  marginBottom: 6,
                }}
              >
                🌿 Complete this order to earn:
              </div>
              <div
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: "24px",
                  color: "#1b4332",
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                +{finalPts} pts
              </div>
              {(showBonus || showTierBonus) && (
                <div
                  style={{
                    fontSize: "10px",
                    color: "#666",
                    marginTop: 6,
                    lineHeight: 1.6,
                  }}
                >
                  Base: {Math.round(basePts)} pts
                  {showBonus && (
                    <span>
                      {" "}
                      + {loyaltyConfig.online_bonus_pct}% online bonus
                    </span>
                  )}
                  {showTierBonus && (
                    <span>
                      {" "}
                      +{" "}
                      <strong style={{ color: "#b5935a" }}>
                        {userTier} {tierMult}× tier
                      </strong>
                    </span>
                  )}
                </div>
              )}
              {!showTierBonus && (
                <div style={{ fontSize: "10px", color: "#888", marginTop: 4 }}>
                  Reach Silver tier for 1.25× bonus on every purchase!
                </div>
              )}
            </div>

            {/* WP-O: Referral code field */}
            <div style={{ marginBottom: "16px" }}>
              <label
                className="body-font"
                style={{
                  display: "block",
                  fontSize: "10px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.muted,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Referral Code (optional)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="e.g. STEVE42"
                  value={referralInput}
                  onChange={(e) =>
                    setReferralInput(e.target.value.toUpperCase())
                  }
                  maxLength={10}
                  style={{
                    width: "100%",
                    padding: "9px 36px 9px 12px",
                    border: `1.5px solid ${referralValid === "valid" ? "#52b788" : referralValid === "invalid" ? "#c0392b" : C.border}`,
                    borderRadius: "2px",
                    fontFamily: "Jost, sans-serif",
                    fontSize: "14px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    background: "#fff",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                {referralChecking && (
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 14,
                    }}
                  >
                    ⏳
                  </span>
                )}
                {!referralChecking && referralValid === "valid" && (
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 14,
                      color: "#52b788",
                    }}
                  >
                    ✓
                  </span>
                )}
                {!referralChecking && referralValid === "invalid" && (
                  <span
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 14,
                      color: "#c0392b",
                    }}
                  >
                    ✗
                  </span>
                )}
              </div>
              {referralValid === "valid" && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#52b788",
                    marginTop: 5,
                    fontFamily: "Jost, sans-serif",
                    fontWeight: 600,
                  }}
                >
                  ✓ Valid code! You'll earn +
                  {loyaltyConfig.pts_referral_referee} bonus pts on this order.
                </div>
              )}
              {referralValid === "invalid" && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#c0392b",
                    marginTop: 5,
                    fontFamily: "Jost, sans-serif",
                  }}
                >
                  ✗ Code not found — check the spelling and try again.
                </div>
              )}
              {!referralInput && (
                <div
                  style={{
                    fontSize: 10,
                    color: C.muted,
                    marginTop: 4,
                    fontFamily: "Jost, sans-serif",
                  }}
                >
                  Enter a friend's referral code to both earn bonus points.
                </div>
              )}
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
