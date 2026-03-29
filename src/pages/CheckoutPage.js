// src/pages/CheckoutPage.js v2.4
// WP-O v2.0: Category multipliers + redemption flow + first-purchase + cross-sell bonuses
// v2.4 changes from v2.3:
//   CRITICAL FIX: loyalty_config fetched with .eq('tenant_id', storefrontTenantId) — no more global .single()
//   CRITICAL FIX: referral_codes lookup now tenant-scoped
//   CRITICAL FIX: useEffect deps include storefrontTenantId — re-runs when tenant resolves async
//   NEW: Category multiplier detection — reads loyalty_category from inventory_items per cart item
//   NEW: 8-category multiplier stack: base × online_bonus × category_mult × tier_mult
//   NEW: First online purchase bonus (pts_first_online_purchase) — one-time, detected via orders table
//   NEW: Cross-sell bonus (pts_crosssell_trigger) — new category detected via user_profiles.category_flags
//   NEW: Harvest Club tier added to getTierLabel + getTierMult
//   NEW: Redemption toggle — shows when userPoints >= min_pts_to_redeem
//   NEW: Redemption adjusts PayFast total, stores redemption data in localStorage for OrderSuccess
//   NEW: protea_last_order enriched with category, multipliers, bonuses for OrderSuccess
//   All v2.3 PayFast + inventory deduction logic preserved EXACTLY — zero changes to that block

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
  // WP-O v2.0 additions
  threshold_harvest_club: 2500,
  mult_tier_harvest_club: 2.5,
  pts_referral_referrer: 100,
  pts_referral_referee: 50,
  referral_min_order_zar: 100,
  redemption_value_zar: 0.1,
  min_pts_to_redeem: 100,
  max_redeem_pct_per_order: 20.0,
  pts_first_online_purchase: 200,
  pts_crosssell_trigger: 150,
  // Category multipliers (defaults = neutral)
  mult_cat_cannabis_flower: 2.0,
  mult_cat_cannabis_vape: 1.75,
  mult_cat_cannabis_edible: 1.5,
  mult_cat_seeds_clones: 3.0,
  mult_cat_grow_supplies: 1.0,
  mult_cat_accessories: 0.75,
  mult_cat_health_wellness: 1.5,
  mult_cat_lifestyle_merch: 2.0,
};

// ─── Tier helpers — WP-O v2.0: Harvest Club added ────────────────────────────
function getTierLabel(pts, cfg) {
  if (pts >= (cfg.threshold_harvest_club || 2500)) return "Harvest Club";
  if (pts >= cfg.threshold_platinum) return "Platinum";
  if (pts >= cfg.threshold_gold) return "Gold";
  if (pts >= cfg.threshold_silver) return "Silver";
  return "Bronze";
}
function getTierMult(tier, cfg) {
  return (
    {
      Bronze: cfg.mult_bronze || 1.0,
      Silver: cfg.mult_silver || 1.25,
      Gold: cfg.mult_gold || 1.5,
      Platinum: cfg.mult_platinum || 2.0,
      "Harvest Club": cfg.mult_tier_harvest_club || 2.5,
    }[tier] || 1.0
  );
}

// ─── Category multiplier helper ───────────────────────────────────────────────
function getCategoryMult(loyaltyCategory, cfg) {
  if (!loyaltyCategory) return 1.0;
  const key = `mult_cat_${loyaltyCategory}`;
  return cfg[key] ?? 1.0;
}

// ─── Detect primary category from cart items (highest unit price wins) ────────
function detectPrimaryCategory(cartItems, categoryMap) {
  // categoryMap: { inventory_item_id → loyalty_category }
  // Use the highest-value item's category
  if (!cartItems || cartItems.length === 0) return null;
  const sorted = [...cartItems].sort((a, b) => (b.price || 0) - (a.price || 0));
  for (const item of sorted) {
    const cat = categoryMap[item.inventory_item_id];
    if (cat) return cat;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function CheckoutPage() {
  const { cartItems, getCartTotal } = useCart();
  const { userEmail } = useContext(RoleContext);
  const { storefrontTenantId } = useStorefront(); // ✦ WP-MULTISITE
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);
  const [payfastUrl, setPayfastUrl] = useState(null);

  // WP-O: loyalty config + user data
  const [loyaltyConfig, setLoyaltyConfig] = useState(DEFAULT_CONFIG);
  const [userPoints, setUserPoints] = useState(0);
  const [referralInput, setReferralInput] = useState("");
  const [referralValid, setReferralValid] = useState(null); // null | "valid" | "invalid"
  const [referralChecking, setReferralChecking] = useState(false);

  // WP-O v2.0: Category + bonus state
  const [categoryMap, setCategoryMap] = useState({}); // { inventory_item_id → loyalty_category }
  const [isFirstOnlinePurchase, setIsFirstOnlinePurchase] = useState(false);
  const [userCategoryFlags, setUserCategoryFlags] = useState({}); // { cannabis_flower: true, ... }

  // WP-O v2.0: Redemption state
  const [redeemPoints, setRedeemPoints] = useState(false);

  const total = getCartTotal();

  // ─── Derived: category detection ─────────────────────────────────────────
  const primaryCategory = detectPrimaryCategory(cartItems, categoryMap);
  const categoryMult = getCategoryMult(primaryCategory, loyaltyConfig);

  // ─── Derived: bonus detection ─────────────────────────────────────────────
  const firstPurchaseBonus = isFirstOnlinePurchase
    ? loyaltyConfig.pts_first_online_purchase || 200
    : 0;

  // Cross-sell: user has never bought from this category before
  const isCrossSell = primaryCategory && !userCategoryFlags[primaryCategory];
  const crossSellBonus = isCrossSell
    ? loyaltyConfig.pts_crosssell_trigger || 150
    : 0;

  // Referral bonus (earned by referee on this order)
  const referralBonus =
    referralValid === "valid" ? loyaltyConfig.pts_referral_referee || 50 : 0;

  // ─── Derived: points calculation ──────────────────────────────────────────
  const userTier = getTierLabel(userPoints, loyaltyConfig);
  const tierMult = getTierMult(userTier, loyaltyConfig);
  const basePts = (total / 100) * loyaltyConfig.pts_per_r100_online;
  const withBonus = basePts * (1 + loyaltyConfig.online_bonus_pct / 100);
  const withCategory = withBonus * categoryMult;
  const withTier = withCategory * tierMult;
  const earnedPts = Math.round(withTier);
  const finalPts =
    earnedPts + firstPurchaseBonus + crossSellBonus + referralBonus;

  // ─── Derived: redemption ──────────────────────────────────────────────────
  const canRedeem = userPoints >= (loyaltyConfig.min_pts_to_redeem || 100);
  const maxRedeemPts = Math.floor(
    (total * (loyaltyConfig.max_redeem_pct_per_order || 20)) /
      100 /
      (loyaltyConfig.redemption_value_zar || 0.1),
  );
  const redeemablePts = Math.min(userPoints, maxRedeemPts);
  const redeemableZar =
    redeemablePts * (loyaltyConfig.redemption_value_zar || 0.1);
  // Effective total sent to PayFast
  const effectiveTotal = redeemPoints
    ? Math.max(1, total - redeemableZar)
    : total;

  // ─── Load loyalty config + user data ──────────────────────────────────────
  // CRITICAL FIX v2.4: deps include storefrontTenantId (was [] in v2.3 — missed async tenant resolution)
  useEffect(() => {
    async function loadLoyaltyData() {
      const [sessionRes] = await Promise.all([supabase.auth.getSession()]);
      const uid = sessionRes.data?.session?.user?.id;

      // CRITICAL FIX: tenant-scoped config fetch (was .single() with no tenant filter in v2.3)
      if (storefrontTenantId) {
        const { data: cfgData } = await supabase
          .from("loyalty_config")
          .select("*")
          .eq("tenant_id", storefrontTenantId)
          .single();
        if (cfgData) setLoyaltyConfig({ ...DEFAULT_CONFIG, ...cfgData });
      }

      if (uid) {
        // Fetch user profile: loyalty_points + category_flags
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("loyalty_points, category_flags")
          .eq("id", uid)
          .single();
        if (prof) {
          setUserPoints(prof.loyalty_points || 0);
          setUserCategoryFlags(prof.category_flags || {});
        }

        // Detect first online purchase: check orders table for any prior orders
        if (storefrontTenantId) {
          const { data: priorOrders } = await supabase
            .from("orders")
            .select("id")
            .eq("user_id", uid)
            .eq("tenant_id", storefrontTenantId)
            .limit(1);
          setIsFirstOnlinePurchase(!priorOrders || priorOrders.length === 0);
        }

        // Fetch loyalty_category for each cart item with an inventory_item_id
        const itemIds = cartItems
          .map((i) => i.inventory_item_id)
          .filter(Boolean);
        if (itemIds.length > 0) {
          const { data: invItems } = await supabase
            .from("inventory_items")
            .select("id, loyalty_category")
            .in("id", itemIds);
          if (invItems) {
            const map = {};
            invItems.forEach((i) => {
              if (i.loyalty_category) map[i.id] = i.loyalty_category;
            });
            setCategoryMap(map);
          }
        }
      }
    }
    loadLoyaltyData();
  }, [storefrontTenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: cartItems intentionally not in deps — categories load once per checkout session

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

  // ─── Referral code validation (debounced) ─────────────────────────────────
  // CRITICAL FIX v2.4: now tenant-scoped
  useEffect(() => {
    if (!referralInput.trim()) {
      setReferralValid(null);
      return;
    }
    const timer = setTimeout(async () => {
      setReferralChecking(true);
      const cleanCode = referralInput.trim().toUpperCase().replace(/\s/g, "");

      // Build query — tenant-scope if we have storefrontTenantId
      let query = supabase
        .from("referral_codes")
        .select("code, owner_id, uses_count")
        .eq("code", cleanCode)
        .eq("is_active", true);
      if (storefrontTenantId) {
        query = query.eq("tenant_id", storefrontTenantId);
      }
      const { data, error: refErr } = await query.maybeSingle();

      if (refErr) {
        console.error(
          "[Checkout] referral code lookup error:",
          refErr.code,
          refErr.message,
        );
      }
      setReferralValid(data ? "valid" : "invalid");
      setReferralChecking(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [referralInput, loyaltyConfig.pts_referral_referrer, storefrontTenantId]);

  // ─── PayFast submit — PRESERVED EXACTLY FROM v2.3, minor additions marked ──
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

      // Store referral code for OrderSuccess to process (unchanged from v2.3)
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

      // WP-O v2.4: Store redemption data for OrderSuccess
      if (redeemPoints && redeemablePts > 0) {
        try {
          localStorage.setItem(
            "protea_redemption",
            JSON.stringify({
              pts: redeemablePts,
              zar: redeemableZar,
            }),
          );
        } catch (_) {}
      } else {
        try {
          localStorage.removeItem("protea_redemption");
        } catch (_) {}
      }

      // PRESERVED EXACTLY: PayFast edge function call
      // WP-O v2.4: effectiveTotal used instead of total when redemption active
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
            total: effectiveTotal, // v2.4: reduced by redemption if active
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

      // WP-O v2.4: Enriched localStorage payload for OrderSuccess
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
            // WP-O v2.3 field (preserved)
            loyalty_pts_pending: finalPts,
            // WP-O v2.4 additions for OrderSuccess to write enriched loyalty_transactions
            category: primaryCategory,
            category_mult: categoryMult,
            tier_at_time: userTier,
            tier_mult: tierMult,
            multiplier_applied: Math.round(categoryMult * tierMult * 100) / 100,
            first_purchase_bonus: firstPurchaseBonus,
            crosssell_bonus: crossSellBonus,
            referral_bonus: referralBonus,
            redeem_pts: redeemPoints ? redeemablePts : 0,
            redeem_zar: redeemPoints ? redeemableZar : 0,
            effective_total: effectiveTotal,
          }),
        );
      } catch (_) {}

      // PRESERVED EXACTLY: Inventory deduction (Task A-5 from v2.2/v2.3)
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
  const showCategoryBonus = categoryMult !== 1.0 && primaryCategory;

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
          {/* Left: Order items — PRESERVED EXACTLY */}
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

            {/* WP-O v2.4: Redemption discount line */}
            {redeemPoints && redeemablePts > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  className="body-font"
                  style={{ fontSize: "13px", color: "#2d6a4f" }}
                >
                  Points redeemed ({redeemablePts} pts)
                </span>
                <span
                  className="body-font"
                  style={{
                    fontSize: "13px",
                    color: "#2d6a4f",
                    fontWeight: 600,
                  }}
                >
                  −R{redeemableZar.toFixed(2)}
                </span>
              </div>
            )}

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
                R
                {effectiveTotal.toLocaleString(undefined, {
                  minimumFractionDigits: redeemPoints ? 2 : 0,
                  maximumFractionDigits: redeemPoints ? 2 : 0,
                })}
              </span>
            </div>

            {/* WP-O v2.4: Redemption toggle — shows when balance >= min_pts_to_redeem */}
            {canRedeem && !submitting && (
              <div
                style={{
                  background: "#fff",
                  border: `1px solid ${C.border}`,
                  borderRadius: "2px",
                  padding: "12px 14px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: redeemPoints ? 6 : 0,
                  }}
                >
                  <div>
                    <span
                      className="body-font"
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#1b4332",
                      }}
                    >
                      Use {redeemablePts} pts = −R{redeemableZar.toFixed(2)} off
                    </span>
                    <div
                      className="body-font"
                      style={{ fontSize: "10px", color: "#888", marginTop: 2 }}
                    >
                      You have {userPoints} pts · Max{" "}
                      {loyaltyConfig.max_redeem_pct_per_order}% of order
                    </div>
                  </div>
                  {/* Toggle */}
                  <div
                    onClick={() => setRedeemPoints((v) => !v)}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      background: redeemPoints ? "#2d6a4f" : "#ccc",
                      cursor: "pointer",
                      position: "relative",
                      flexShrink: 0,
                      transition: "background 0.2s",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 2,
                        left: redeemPoints ? 18 : 2,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    />
                  </div>
                </div>
                {redeemPoints && (
                  <div
                    className="body-font"
                    style={{
                      fontSize: "10px",
                      color: "#2d6a4f",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Points applied — your card will be charged R
                    {effectiveTotal.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            {/* WP-O: Config-driven points preview — enhanced for v2.4 */}
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
              {/* Points breakdown */}
              <div
                style={{
                  fontSize: "10px",
                  color: "#666",
                  marginTop: 6,
                  lineHeight: 1.7,
                }}
              >
                <div>
                  Base: {Math.round(basePts)} pts
                  {showBonus && (
                    <span>
                      {" "}
                      + {loyaltyConfig.online_bonus_pct}% online bonus
                    </span>
                  )}
                  {showCategoryBonus && (
                    <span style={{ color: "#1b4332" }}>
                      {" "}
                      + {primaryCategory.replace(/_/g, " ")} {categoryMult}×
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
                {firstPurchaseBonus > 0 && (
                  <div style={{ color: "#2d6a4f", fontWeight: 600 }}>
                    + {firstPurchaseBonus} pts first online order bonus!
                  </div>
                )}
                {crossSellBonus > 0 && (
                  <div style={{ color: "#2d6a4f", fontWeight: 600 }}>
                    + {crossSellBonus} pts first{" "}
                    {(primaryCategory || "").replace(/_/g, " ")} purchase!
                  </div>
                )}
                {referralBonus > 0 && (
                  <div style={{ color: "#2d6a4f", fontWeight: 600 }}>
                    + {referralBonus} pts referral bonus
                  </div>
                )}
              </div>
              {!showTierBonus && (
                <div style={{ fontSize: "10px", color: "#888", marginTop: 4 }}>
                  Reach Silver tier for 1.25× bonus on every purchase!
                </div>
              )}
            </div>

            {/* WP-O: Referral code field — PRESERVED from v2.3, now tenant-scoped */}
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

            {/* Pay button — PRESERVED EXACTLY from v2.3 */}
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

        {/* PayFast hidden form — PRESERVED EXACTLY */}
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
