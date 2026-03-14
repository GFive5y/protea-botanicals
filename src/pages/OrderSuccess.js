// src/pages/OrderSuccess.js — Protea Botanicals v2.0
// ============================================================================
// v2.0 — WP-O Loyalty Engine Integration + Referral Processing
//
//   CHANGES from v1.x:
//     - Reads loyalty_config to calculate correct points (was hardcoded /100)
//     - Formula: (total/100) × pts_per_r100_online × online_bonus_pct × tier_mult
//     - Processes protea_referral_code from localStorage:
//         → awards pts_referral_referee to buyer (this user)
//         → awards pts_referral_referrer to code owner
//         → increments referral_codes.uses_count
//         → writes loyalty_transactions for both (channel: 'referral')
//         → sends WhatsApp notification to referrer
//         → writes customer_messages inbox entry for referrer
//         → writes welcome inbox message to referee about their bonus
//     - Writes loyalty_transactions with channel:'online_purchase',
//       multiplier_applied, tier_at_time
//     - Shows live updated balance after award
//     - Referral success banner if referral was processed
//     - Clears localStorage after processing (idempotent)
// ============================================================================

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import ClientHeader from "../components/ClientHeader";

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e8e0d4",
  muted: "#888",
  text: "#1a1a1a",
  white: "#fff",
  red: "#c0392b",
  lightGreen: "#eafaf1",
  lightGold: "#fef9e7",
  lightBlue: "#eaf0f8",
  blue: "#2c4a6e",
  warm: "#f4f0e8",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

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
  pts_referral_referrer: 200,
  pts_referral_referee: 100,
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
function calcPurchasePoints(total, cfg, tier) {
  const base = (total / 100) * cfg.pts_per_r100_online;
  const withBonus = base * (1 + cfg.online_bonus_pct / 100);
  return Math.round(withBonus * getTierMult(tier, cfg));
}

export default function OrderSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderRef =
    searchParams.get("ref") || searchParams.get("m_payment_id") || "—";

  const [order, setOrder] = useState(null);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [referralBonus, setReferralBonus] = useState(0);
  const [referralProcessed, setReferralProcessed] = useState(false);
  const [referrerName, setReferrerName] = useState("");
  const [newBalance, setNewBalance] = useState(null);
  const [tierLabel, setTierLabel] = useState("Bronze");
  const [multiplierUsed, setMultiplierUsed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Read order from localStorage
    try {
      const saved = localStorage.getItem("protea_last_order");
      if (saved) setOrder(JSON.parse(saved));
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (processed) return;
    setProcessed(true);

    async function processOrder() {
      try {
        // 1. Get current user
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }
        const userId = session.user.id;

        // 2. Fetch loyalty config + user profile in parallel
        const [cfgRes, profileRes] = await Promise.all([
          supabase.from("loyalty_config").select("*").single(),
          supabase.from("user_profiles").select("*").eq("id", userId).single(),
        ]);

        const cfg = cfgRes.data || DEFAULT_CONFIG;
        const profile = profileRes.data;
        if (!profile) {
          setLoading(false);
          return;
        }

        const currentPts = profile.loyalty_points || 0;
        const tier = getTierLabel(currentPts, cfg);
        const mult = getTierMult(tier, cfg);
        setTierLabel(tier);
        setMultiplierUsed(mult);

        // 3. Get order total
        let total = 0;
        try {
          const saved = localStorage.getItem("protea_last_order");
          if (saved) total = JSON.parse(saved).total || 0;
        } catch (_) {}

        // 4. Calculate config-driven purchase points
        const purchasePts = calcPurchasePoints(total, cfg, tier);

        // 5. Idempotency guard — prevent double-award (React 18 StrictMode fires effects twice in dev)
        const { data: existingTxn } = await supabase
          .from("loyalty_transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("source_id", orderRef)
          .eq("channel", "online_purchase")
          .maybeSingle();

        if (existingTxn) {
          console.log("[OrderSuccess] already processed, skipping award");
          // Still load balance for display
          const { data: freshProfile } = await supabase
            .from("user_profiles")
            .select("loyalty_points")
            .eq("id", userId)
            .single();
          setNewBalance(freshProfile?.loyalty_points || currentPts);
          // Try to detect if referral was also already processed
          const { data: existingRefTxn } = await supabase
            .from("loyalty_transactions")
            .select("id,points")
            .eq("user_id", userId)
            .eq("channel", "referral")
            .eq("source_id", storedCode || "")
            .maybeSingle();
          if (existingRefTxn) {
            setReferralBonus(existingRefTxn.points || 0);
            setReferralProcessed(true);
          }
          setLoading(false);
          return;
        }

        // 5. Award purchase points
        let newPts = currentPts + purchasePts;
        await supabase
          .from("user_profiles")
          .update({ loyalty_points: newPts })
          .eq("id", userId);
        await supabase.from("loyalty_transactions").insert({
          user_id: userId,
          transaction_type: "EARNED",
          points: purchasePts,
          balance_after: newPts,
          source: "online_purchase",
          source_id: orderRef,
          description: `Purchase reward — Order ${orderRef}`,
          transaction_date: new Date().toISOString(),
          multiplier_applied: mult,
          tier_at_time: tier,
          channel: "online_purchase",
        });

        setPointsAwarded(purchasePts);

        // 6. Process referral code if present
        const storedCode = (() => {
          try {
            return localStorage.getItem("protea_referral_code");
          } catch (_) {
            return null;
          }
        })();

        if (storedCode && total >= (cfg.referral_min_order_zar || 100)) {
          // Find referral code owner
          const { data: refCode } = await supabase
            .from("referral_codes")
            .select("id, owner_id, uses_count, code")
            .eq("code", storedCode)
            .eq("is_active", true)
            .maybeSingle();

          if (refCode && refCode.owner_id !== userId) {
            const refBonus = cfg.pts_referral_referee || 100;
            const referrerBonus = cfg.pts_referral_referrer || 200;

            // Award bonus to referee (this user)
            newPts = newPts + refBonus;
            await supabase
              .from("user_profiles")
              .update({ loyalty_points: newPts })
              .eq("id", userId);
            await supabase.from("loyalty_transactions").insert({
              user_id: userId,
              transaction_type: "EARNED",
              points: refBonus,
              balance_after: newPts,
              source: "referral",
              source_id: refCode.code,
              description: `Referral bonus — joined with code ${refCode.code}`,
              transaction_date: new Date().toISOString(),
              multiplier_applied: 1.0,
              tier_at_time: tier,
              channel: "referral",
            });

            // Award bonus to referrer (code owner)
            const { data: referrerProfile } = await supabase
              .from("user_profiles")
              .select("loyalty_points, full_name, phone")
              .eq("id", refCode.owner_id)
              .single();

            if (referrerProfile) {
              const referrerNewPts =
                (referrerProfile.loyalty_points || 0) + referrerBonus;
              await supabase
                .from("user_profiles")
                .update({ loyalty_points: referrerNewPts })
                .eq("id", refCode.owner_id);
              await supabase.from("loyalty_transactions").insert({
                user_id: refCode.owner_id,
                transaction_type: "EARNED",
                points: referrerBonus,
                balance_after: referrerNewPts,
                source: "referral",
                source_id: refCode.code,
                description: `Referral reward — your code ${refCode.code} was used!`,
                transaction_date: new Date().toISOString(),
                multiplier_applied: 1.0,
                tier_at_time: getTierLabel(
                  referrerProfile.loyalty_points || 0,
                  cfg,
                ),
                channel: "referral",
              });

              // Increment uses_count
              await supabase
                .from("referral_codes")
                .update({ uses_count: (refCode.uses_count || 0) + 1 })
                .eq("id", refCode.id);

              // Inbox message to referrer
              const referreeName = profile.full_name || "a friend";
              await supabase.from("customer_messages").insert({
                user_id: refCode.owner_id,
                subject: `🎉 Your referral code was used — +${referrerBonus} pts!`,
                content: `Great news! ${referreeName} just made their first order using your referral code ${refCode.code}.\n\nAs a thank you, we've added ${referrerBonus} loyalty points to your account. Your new balance is ${referrerNewPts} pts.\n\nKeep sharing your code — every friend you refer earns you more rewards. 🌿`,
                type: "referral_reward",
                read: false,
                created_at: new Date().toISOString(),
              });

              // WhatsApp notification to referrer
              if (referrerProfile.phone) {
                try {
                  await fetch(`${SUPABASE_FUNCTIONS_URL}/send-notification`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: "whatsapp",
                      trigger: "referral_reward",
                      recipient: {
                        phone: referrerProfile.phone,
                        name: referrerProfile.full_name || "",
                      },
                      data: {
                        message: `🌿 *Protea Botanicals*\n\n🎉 Your referral code *${refCode.code}* was just used by ${referreeName}!\n\nWe've added *${referrerBonus} loyalty points* to your account as a thank you.\n\n💎 New balance: *${referrerNewPts} pts*\n\nKeep sharing your code — every referral earns you more rewards!`,
                      },
                    }),
                  });
                } catch (_) {
                  /* non-blocking */
                }
              }

              setReferrerName(referrerProfile.full_name || "your friend");
            }

            // Welcome inbox message to referee (this user)
            await supabase.from("customer_messages").insert({
              user_id: userId,
              subject: `Welcome to Protea Botanicals — +${refBonus} referral bonus!`,
              content: `Welcome to Protea Botanicals! 🌿 Because you joined with a referral code, we've added a ${refBonus} bonus points gift to your loyalty account on top of your purchase reward. Check your loyalty dashboard to see your full balance and start earning more rewards with every purchase and QR scan.`,
              type: "referral_welcome",
              read: false,
              created_at: new Date().toISOString(),
            });

            setReferralBonus(refBonus);
            setReferralProcessed(true);

            // Clear referral code — processed
            try {
              localStorage.removeItem("protea_referral_code");
            } catch (_) {}
          }
        }

        // 7. Check for tier upgrade — update profile + write inbox message
        const newTier = getTierLabel(newPts, cfg);
        if (newTier !== tier) {
          await supabase
            .from("user_profiles")
            .update({ loyalty_tier: newTier })
            .eq("id", userId);
          const tierIcons = { Silver: "🥈", Gold: "🥇", Platinum: "💎" };
          const tierMults = { Silver: "1.25×", Gold: "1.5×", Platinum: "2×" };
          const firstName = profile?.full_name
            ? profile.full_name.split(" ")[0]
            : "";
          await supabase.from("customer_messages").insert({
            user_id: userId,
            subject: `${tierIcons[newTier] || "🏆"} You've reached ${newTier} tier!`,
            content: `Congratulations${firstName ? " " + firstName : ""}! 🎉 Your purchase just pushed you into ${newTier} tier status on the Protea Botanicals loyalty programme.\n\nYour new earning rate: ${tierMults[newTier] || "2×"} points on every purchase and QR scan — effective immediately.\n\nThank you for being a loyal Protea customer. 🌿`,
            type: "tier_upgrade",
            read: false,
            created_at: new Date().toISOString(),
          });
          // WhatsApp tier upgrade notification
          if (profile?.phone) {
            try {
              const SUPABASE_FUNCTIONS_URL =
                process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
                "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";
              await fetch(`${SUPABASE_FUNCTIONS_URL}/send-notification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "whatsapp",
                  trigger: "tier_upgrade",
                  recipient: {
                    phone: profile.phone,
                    name: profile.full_name || "",
                  },
                  data: { old_tier: tier, new_tier: newTier, points: newPts },
                }),
              });
            } catch (_) {}
          }
        }

        setNewBalance(newPts);

        // 8. Clear order from localStorage to prevent re-processing on refresh
        try {
          localStorage.removeItem("protea_last_order");
        } catch (_) {}
      } catch (err) {
        console.error("[OrderSuccess] processing error:", err);
      } finally {
        setLoading(false);
      }
    }

    processOrder();
  }, [orderRef, processed]);

  const totalPts = pointsAwarded + referralBonus;

  return (
    <>
      <ClientHeader variant="light" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Jost:wght@300;400;500;600;700&display=swap');
        @keyframes os-fade { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes os-check { 0%{transform:scale(0);} 60%{transform:scale(1.15);} 100%{transform:scale(1);} }
        .os-card { animation: os-fade 0.4s ease both; }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          background: C.cream,
          fontFamily: F.body,
          padding: "40px 20px 80px",
        }}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {/* ── CONFIRMATION HEADER ── */}
          <div
            className="os-card"
            style={{ textAlign: "center", marginBottom: 32 }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: C.lightGreen,
                border: `2px solid ${C.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                animation: "os-check 0.5s ease 0.2s both",
              }}
            >
              <span style={{ fontSize: 32, color: C.accent }}>✓</span>
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: C.accent,
                marginBottom: 8,
              }}
            >
              Order Confirmed
            </div>
            <h1
              style={{
                fontFamily: F.heading,
                fontSize: "clamp(28px,5vw,38px)",
                fontWeight: 300,
                color: C.text,
                margin: "0 0 8px",
              }}
            >
              Thank You for Your Order
            </h1>
            <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
              Your payment has been confirmed. You'll receive a confirmation
              email shortly.
            </p>
          </div>

          {/* ── LOYALTY REWARD CARD ── */}
          <div
            className="os-card"
            style={{
              animationDelay: "0.1s",
              background: loading ? C.warm : C.lightGreen,
              border: `1px solid ${loading ? C.border : C.accent}`,
              borderLeft: `4px solid ${loading ? C.border : C.accent}`,
              borderRadius: 3,
              padding: "20px 24px",
              marginBottom: 16,
            }}
          >
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    border: `2px solid ${C.border}`,
                    borderTopColor: C.accent,
                    borderRadius: "50%",
                    animation: "os-check 0.8s linear infinite",
                  }}
                />
                <span style={{ fontSize: 13, color: C.muted }}>
                  Calculating your loyalty reward…
                </span>
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: C.accent,
                    marginBottom: 6,
                  }}
                >
                  Loyalty Reward
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: referralBonus > 0 ? 8 : 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: F.heading,
                      fontSize: 44,
                      fontWeight: 700,
                      color: C.green,
                      lineHeight: 1,
                    }}
                  >
                    +{totalPts}
                  </span>
                  <span style={{ fontSize: 14, color: C.mid, fontWeight: 500 }}>
                    points added
                  </span>
                </div>

                {/* Breakdown */}
                <div style={{ fontSize: 12, color: C.mid, marginBottom: 4 }}>
                  Purchase reward: <strong>+{pointsAwarded} pts</strong>
                  {multiplierUsed > 1 && (
                    <span style={{ color: C.gold, marginLeft: 6 }}>
                      ({tierLabel} {multiplierUsed}× bonus)
                    </span>
                  )}
                </div>

                {referralBonus > 0 && (
                  <div style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>
                    Referral welcome bonus:{" "}
                    <strong>+{referralBonus} pts</strong> 🎁
                  </div>
                )}

                {newBalance !== null && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: C.mid,
                      borderTop: `1px solid ${C.accent}30`,
                      paddingTop: 8,
                    }}
                  >
                    New balance:{" "}
                    <strong
                      style={{
                        color: C.green,
                        fontFamily: F.heading,
                        fontSize: 18,
                      }}
                    >
                      {newBalance.toLocaleString()} pts
                    </strong>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── REFERRAL SUCCESS BANNER ── */}
          {referralProcessed && !loading && (
            <div
              className="os-card"
              style={{
                animationDelay: "0.2s",
                background: C.lightGold,
                border: `1px solid ${C.gold}40`,
                borderLeft: `4px solid ${C.gold}`,
                borderRadius: 3,
                padding: "16px 20px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: C.gold,
                  marginBottom: 4,
                }}
              >
                Referral Bonus Applied
              </div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>
                You earned{" "}
                <strong style={{ color: C.gold }}>
                  +{referralBonus} bonus pts
                </strong>{" "}
                for joining with a referral code. We've also sent{" "}
                <strong>{referrerName}</strong> a thank-you notification and
                their reward. 🌿
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                Check your inbox — you have a welcome message waiting.
              </div>
            </div>
          )}

          {/* ── ORDER DETAILS ── */}
          {order && (
            <div
              className="os-card"
              style={{
                animationDelay: "0.25s",
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                padding: "20px 24px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: C.muted,
                  marginBottom: 16,
                }}
              >
                Order Details
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { label: "Reference", value: orderRef },
                  {
                    label: "Date",
                    value: new Date().toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }),
                  },
                  { label: "Status", value: null, badge: "PAID ✓" },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: C.muted }}>{row.label}</span>
                    {row.badge ? (
                      <span
                        style={{
                          background: C.lightGreen,
                          color: C.accent,
                          border: `1px solid ${C.accent}40`,
                          borderRadius: 2,
                          padding: "2px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {row.badge}
                      </span>
                    ) : (
                      <span style={{ color: C.text, fontWeight: 500 }}>
                        {row.value}
                      </span>
                    )}
                  </div>
                ))}
                <div
                  style={{
                    borderTop: `1px solid ${C.border}`,
                    paddingTop: 10,
                    marginTop: 4,
                  }}
                >
                  {(order.items || []).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: C.text }}>
                        {item.name} × {item.qty}
                      </span>
                      <span style={{ color: C.text, fontWeight: 500 }}>
                        R{(item.price * item.qty).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 15,
                      fontWeight: 700,
                      borderTop: `1px solid ${C.border}`,
                      paddingTop: 10,
                      marginTop: 4,
                    }}
                  >
                    <span>Total</span>
                    <span
                      style={{
                        fontFamily: F.heading,
                        fontSize: 22,
                        color: C.green,
                      }}
                    >
                      R{(order.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ACTIONS ── */}
          <div
            className="os-card"
            style={{ animationDelay: "0.3s", display: "grid", gap: 10 }}
          >
            <button
              onClick={() => navigate("/shop")}
              style={{
                padding: "14px",
                background: C.green,
                color: C.white,
                border: "none",
                borderRadius: 2,
                fontFamily: F.body,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Continue Shopping
            </button>
            <button
              onClick={() => navigate("/loyalty")}
              style={{
                padding: "14px",
                background: C.white,
                color: C.green,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                fontFamily: F.body,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              View Loyalty Points
            </button>
            {referralProcessed && (
              <button
                onClick={() =>
                  navigate("/account", { state: { tab: "inbox" } })
                }
                style={{
                  padding: "14px",
                  background: C.lightGold,
                  color: C.gold,
                  border: `1px solid ${C.gold}40`,
                  borderRadius: 2,
                  fontFamily: F.body,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                📬 View Your Welcome Message
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
