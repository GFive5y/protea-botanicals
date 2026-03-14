// src/components/LoyaltyBadges.js — Protea Botanicals v1.0
// ============================================================================
// WP-O — Achievement Badge System
//
// Badge categories:
//   TIER      — Bronze/Silver/Gold/Platinum (from points total)
//   EXPLORER  — First Scan, Strain Hunter, QR Explorer, Road Tripper
//   LOYALTY   — First Purchase, The Hero, Regular, Profile Complete
//   SOCIAL    — Ambassador (refer 1), Top Referrer (refer 3)
//   SPECIAL   — Early Adopter, Streak Master
//
// All badges computed client-side from existing tables:
//   scan_logs, loyalty_transactions, user_profiles, referral_codes
// No new DB tables required.
// Greyed-out with progress bar until earned, full colour when achieved.
// ============================================================================

import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";

const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  border: "#e8e0d4",
  muted: "#aaa",
  text: "#1a1a1a",
  white: "#fff",
  warm: "#f4f0e8",
  lightGreen: "#eafaf1",
  lightGold: "#fef9e7",
  platinum: "#7b68ee",
  silver: "#8e9ba8",
  bronze: "#a0674b",
};
const F = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', sans-serif",
};

// ── Badge definitions ────────────────────────────────────────────────────────
const BADGE_DEFS = [
  // TIER
  {
    id: "bronze_member",
    category: "Tier",
    icon: "🥉",
    name: "Bronze Member",
    desc: "Welcome to the Protea loyalty family",
    how: "Join the loyalty programme",
    color: C.bronze,
    bg: "rgba(160,103,75,0.12)",
    check: (d) => d.points >= 0,
    progress: () => 1,
  },
  {
    id: "silver_member",
    category: "Tier",
    icon: "🥈",
    name: "Silver Scout",
    desc: "You're building serious momentum",
    how: "Reach 200 loyalty points",
    color: C.silver,
    bg: "rgba(142,155,168,0.15)",
    check: (d) => d.points >= 200,
    progress: (d) => Math.min(d.points / 200, 1),
  },
  {
    id: "gold_member",
    category: "Tier",
    icon: "🥇",
    name: "Gold Standard",
    desc: "A true Protea connoisseur",
    how: "Reach 500 loyalty points",
    color: C.gold,
    bg: "rgba(181,147,90,0.15)",
    check: (d) => d.points >= 500,
    progress: (d) => Math.min(d.points / 500, 1),
  },
  {
    id: "platinum_member",
    category: "Tier",
    icon: "💎",
    name: "Platinum Elite",
    desc: "The pinnacle of loyalty. Legend.",
    how: "Reach 1000 loyalty points",
    color: C.platinum,
    bg: "rgba(123,104,238,0.15)",
    check: (d) => d.points >= 1000,
    progress: (d) => Math.min(d.points / 1000, 1),
  },

  // EXPLORER
  {
    id: "first_scan",
    category: "Explorer",
    icon: "📱",
    name: "First Contact",
    desc: "You scanned your first Protea product",
    how: "Scan any QR code",
    color: C.accent,
    bg: "rgba(82,183,136,0.12)",
    check: (d) => d.totalScans >= 1,
    progress: (d) => Math.min(d.totalScans, 1),
  },
  {
    id: "strain_hunter",
    category: "Explorer",
    icon: "🌿",
    name: "Strain Hunter",
    desc: "Explorers never stop at one strain",
    how: "Scan 5 different product strains",
    color: "#3a7d44",
    bg: "rgba(58,125,68,0.12)",
    check: (d) => d.uniqueStrains >= 5,
    progress: (d) => Math.min(d.uniqueStrains / 5, 1),
    progressLabel: (d) => `${d.uniqueStrains}/5 strains`,
  },
  {
    id: "qr_explorer",
    category: "Explorer",
    icon: "🔍",
    name: "QR Explorer",
    desc: "You've scanned your way across the range",
    how: "Scan 10 different QR codes",
    color: C.blue,
    bg: "rgba(44,74,110,0.12)",
    check: (d) => d.totalScans >= 10,
    progress: (d) => Math.min(d.totalScans / 10, 1),
    progressLabel: (d) => `${d.totalScans}/10 scans`,
  },
  {
    id: "road_tripper",
    category: "Explorer",
    icon: "🗺️",
    name: "Road Tripper",
    desc: "Protea travels with you everywhere",
    how: "Scan from 3 different cities",
    color: "#e67e22",
    bg: "rgba(230,126,34,0.12)",
    check: (d) => d.uniqueCities >= 3,
    progress: (d) => Math.min(d.uniqueCities / 3, 1),
    progressLabel: (d) => `${d.uniqueCities}/3 cities`,
  },
  {
    id: "night_owl",
    category: "Explorer",
    icon: "🦉",
    name: "Night Owl",
    desc: "The best things happen after midnight",
    how: "Scan a product after 10pm",
    color: "#34495e",
    bg: "rgba(52,73,94,0.12)",
    check: (d) => d.hasNightScan,
    progress: (d) => (d.hasNightScan ? 1 : 0),
  },

  // LOYALTY
  {
    id: "first_purchase",
    category: "Loyalty",
    icon: "🛒",
    name: "First Order",
    desc: "Your journey with Protea begins",
    how: "Complete your first online order",
    color: "#27ae60",
    bg: "rgba(39,174,96,0.12)",
    check: (d) => d.purchases >= 1,
    progress: (d) => Math.min(d.purchases, 1),
  },
  {
    id: "the_hero",
    category: "Loyalty",
    icon: "💪",
    name: "The Hero",
    desc: "When you know what you love, you commit",
    how: "Purchase the same strain 5 times",
    color: "#c0392b",
    bg: "rgba(192,57,43,0.12)",
    check: (d) => d.maxRepeatStrain >= 5,
    progress: (d) => Math.min(d.maxRepeatStrain / 5, 1),
    progressLabel: (d) => `${d.maxRepeatStrain}/5 repeat purchases`,
  },
  {
    id: "regular",
    category: "Loyalty",
    icon: "⭐",
    name: "Regular",
    desc: "Consistency is its own kind of excellence",
    how: "Place 3 online orders",
    color: C.gold,
    bg: C.lightGold,
    check: (d) => d.purchases >= 3,
    progress: (d) => Math.min(d.purchases / 3, 1),
    progressLabel: (d) => `${d.purchases}/3 orders`,
  },
  {
    id: "profile_complete",
    category: "Loyalty",
    icon: "✅",
    name: "Open Book",
    desc: "Full transparency — fully rewarded",
    how: "Complete 100% of your rewards profile",
    color: C.accent,
    bg: C.lightGreen,
    check: (d) => d.profilePct >= 100,
    progress: (d) => d.profilePct / 100,
    progressLabel: (d) => `${d.profilePct}% complete`,
  },
  {
    id: "big_spender",
    category: "Loyalty",
    icon: "💰",
    name: "Big Spender",
    desc: "Quality over quantity — you understand",
    how: "Earn 500 points from purchases alone",
    color: "#8e44ad",
    bg: "rgba(142,68,173,0.12)",
    check: (d) => d.purchasePts >= 500,
    progress: (d) => Math.min(d.purchasePts / 500, 1),
    progressLabel: (d) => `${d.purchasePts}/500 pts from purchases`,
  },

  // SOCIAL
  {
    id: "ambassador",
    category: "Social",
    icon: "🤝",
    name: "Ambassador",
    desc: "Sharing is the highest form of loyalty",
    how: "Successfully refer 1 friend",
    color: "#25D366",
    bg: "rgba(37,211,102,0.12)",
    check: (d) => d.referralUses >= 1,
    progress: (d) => Math.min(d.referralUses, 1),
  },
  {
    id: "top_referrer",
    category: "Social",
    icon: "👑",
    name: "Top Referrer",
    desc: "You've built a small army of Protea fans",
    how: "Successfully refer 3 friends",
    color: C.gold,
    bg: C.lightGold,
    check: (d) => d.referralUses >= 3,
    progress: (d) => Math.min(d.referralUses / 3, 1),
    progressLabel: (d) => `${d.referralUses}/3 referrals`,
  },

  // SPECIAL
  {
    id: "early_adopter",
    category: "Special",
    icon: "🚀",
    name: "Early Adopter",
    desc: "You were here before it was cool",
    how: "Join within the first year of launch",
    color: "#e74c3c",
    bg: "rgba(231,76,60,0.12)",
    check: (d) => d.isEarlyAdopter,
    progress: (d) => (d.isEarlyAdopter ? 1 : 0),
  },
  {
    id: "streak_master",
    category: "Special",
    icon: "🔥",
    name: "Streak Master",
    desc: "Five scans in a single week — unstoppable",
    how: "Scan 5 products in one week",
    color: "#e67e22",
    bg: "rgba(230,126,34,0.12)",
    check: (d) => d.hasWeekStreak,
    progress: (d) =>
      d.hasWeekStreak ? 1 : Math.min((d.maxWeekScans || 0) / 5, 1),
    progressLabel: (d) =>
      d.hasWeekStreak ? "Achieved!" : `Best week: ${d.maxWeekScans || 0}/5`,
  },
];

const CATEGORIES = ["Tier", "Explorer", "Loyalty", "Social", "Special"];

// ── Data loader ──────────────────────────────────────────────────────────────
async function loadBadgeData(userId, profile) {
  const [scansRes, txnRes, refRes] = await Promise.all([
    supabase
      .from("scan_logs")
      .select("id,scanned_at,qr_type,ip_city,campaign_name,batch_id")
      .eq("user_id", userId)
      .limit(200),
    supabase
      .from("loyalty_transactions")
      .select("points,channel,description,transaction_date,source_id")
      .eq("user_id", userId)
      .limit(200),
    supabase
      .from("referral_codes")
      .select("uses_count")
      .eq("owner_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const scans = scansRes.data || [];
  const txns = txnRes.data || [];
  const referralUses = refRes.data?.uses_count || 0;

  // Unique strains from campaign_name (best proxy without joining batches)
  const strainScans = scans.filter((s) => s.campaign_name || s.batch_id);
  const uniqueStrains = new Set(
    scans.map((s) => s.campaign_name).filter(Boolean),
  ).size;
  const uniqueCities = new Set(scans.map((s) => s.ip_city).filter(Boolean))
    .size;

  // Night scans (after 22:00 or before 04:00 local)
  const hasNightScan = scans.some((s) => {
    if (!s.scanned_at) return false;
    const h = new Date(s.scanned_at).getHours();
    return h >= 22 || h < 4;
  });

  // Purchases
  const purchaseTxns = txns.filter((t) => t.channel === "online_purchase");
  const purchases = purchaseTxns.length;
  const purchasePts = purchaseTxns.reduce((s, t) => s + (t.points || 0), 0);

  // Repeat strain — count by description prefix
  const strainCounts = {};
  purchaseTxns.forEach((t) => {
    const desc = (t.description || "")
      .replace(/^Purchase reward — /, "")
      .replace(/Order .*/, "")
      .trim();
    if (desc) strainCounts[desc] = (strainCounts[desc] || 0) + 1;
  });
  const maxRepeatStrain = Math.max(0, ...Object.values(strainCounts));

  // Week streak — find week with most scans
  const weekCounts = {};
  scans.forEach((s) => {
    if (!s.scanned_at) return;
    const d = new Date(s.scanned_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weekCounts[key] = (weekCounts[key] || 0) + 1;
  });
  const maxWeekScans = Math.max(0, ...Object.values(weekCounts));
  const hasWeekStreak = maxWeekScans >= 5;

  // Early adopter — before July 2026
  const isEarlyAdopter = profile?.created_at
    ? new Date(profile.created_at) < new Date("2026-07-01")
    : false;

  // Profile completeness
  const profileFields = [
    "date_of_birth",
    "gender",
    "preferred_type",
    "acquisition_channel",
    "province",
    "city",
    "geolocation_consent",
    "marketing_opt_in",
    "analytics_opt_in",
  ];
  const profileFilled = profileFields.filter((f) => {
    const v = profile?.[f];
    return v !== null && v !== undefined && v !== "" && v !== false;
  }).length;
  const profilePct = Math.round((profileFilled / profileFields.length) * 100);

  return {
    points: profile?.loyalty_points || 0,
    totalScans: scans.length,
    uniqueStrains,
    uniqueCities,
    hasNightScan,
    purchases,
    purchasePts,
    maxRepeatStrain,
    hasWeekStreak,
    maxWeekScans,
    isEarlyAdopter,
    profilePct,
    referralUses,
  };
}

// ── Badge Card ───────────────────────────────────────────────────────────────
function BadgeCard({ badge, data }) {
  const earned = badge.check(data);
  const pct = Math.round(badge.progress(data) * 100);
  const progressLabel = badge.progressLabel
    ? badge.progressLabel(data)
    : earned
      ? "Achieved!"
      : `${pct}%`;
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: earned ? badge.bg : "#f4f0e8",
        border: `1.5px solid ${earned ? badge.color + "60" : "#e0dbd2"}`,
        borderRadius: 4,
        padding: "16px 14px",
        textAlign: "center",
        position: "relative",
        transition: "transform 0.2s, box-shadow 0.2s",
        transform: hover && earned ? "translateY(-2px)" : "none",
        boxShadow: hover && earned ? `0 6px 20px ${badge.color}30` : "none",
        opacity: earned ? 1 : 0.65,
        filter: earned ? "none" : "grayscale(60%)",
      }}
    >
      {/* Earned glow ring */}
      {earned && (
        <div
          style={{
            position: "absolute",
            inset: -1,
            borderRadius: 4,
            border: `2px solid ${badge.color}40`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Lock overlay for unearned */}
      {!earned && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 10,
            color: C.muted,
          }}
        >
          🔒
        </div>
      )}

      {/* Icon */}
      <div
        style={{
          fontSize: 32,
          marginBottom: 6,
          lineHeight: 1,
          filter: earned ? "none" : "grayscale(80%)",
        }}
      >
        {badge.icon}
      </div>

      {/* Name */}
      <div
        style={{
          fontFamily: F.heading,
          fontSize: 14,
          fontWeight: 600,
          color: earned ? badge.color : C.muted,
          marginBottom: 4,
          lineHeight: 1.2,
        }}
      >
        {badge.name}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 10,
          color: earned ? "#555" : C.muted,
          lineHeight: 1.4,
          marginBottom: 8,
          minHeight: 28,
        }}
      >
        {earned ? badge.desc : badge.how}
      </div>

      {/* Progress bar */}
      {!earned && pct > 0 && (
        <div style={{ marginTop: 4 }}>
          <div
            style={{
              height: 3,
              background: "#e0dbd2",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: badge.color,
                width: `${pct}%`,
                borderRadius: 2,
                transition: "width 1s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>
            {progressLabel}
          </div>
        </div>
      )}

      {/* Earned checkmark */}
      {earned && (
        <div
          style={{
            display: "inline-block",
            background: badge.color,
            color: C.white,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: 10,
            marginTop: 4,
          }}
        >
          ✓ Earned
        </div>
      )}
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function LoyaltyBadges({ userId, profile }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    if (!userId || !profile) return;
    loadBadgeData(userId, profile).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [userId, profile?.loyalty_points]); // eslint-disable-line

  if (loading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: C.muted, fontFamily: F.body }}>
          Loading your badges…
        </div>
      </div>
    );
  }
  if (!data) return null;

  const earned = BADGE_DEFS.filter((b) => b.check(data)).length;
  const total = BADGE_DEFS.length;

  const categories = ["All", ...CATEGORIES];
  const visible =
    activeCategory === "All"
      ? BADGE_DEFS
      : BADGE_DEFS.filter((b) => b.category === activeCategory);

  return (
    <div style={{ fontFamily: F.body }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: C.accent,
              marginBottom: 4,
            }}
          >
            Achievement Badges
          </div>
          <div style={{ fontFamily: F.heading, fontSize: 22, color: C.green }}>
            {earned} / {total} earned
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
            Collection progress
          </div>
          <div
            style={{
              width: 120,
              height: 6,
              background: C.border,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: `linear-gradient(to right, ${C.accent}, ${C.gold})`,
                width: `${(earned / total) * 100}%`,
                transition: "width 1s ease",
                borderRadius: 3,
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            {Math.round((earned / total) * 100)}% complete
          </div>
        </div>
      </div>

      {/* Category filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {categories.map((cat) => {
          const catEarned =
            cat === "All"
              ? earned
              : BADGE_DEFS.filter((b) => b.category === cat && b.check(data))
                  .length;
          const catTotal =
            cat === "All"
              ? total
              : BADGE_DEFS.filter((b) => b.category === cat).length;
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${active ? C.green : C.border}`,
                background: active ? C.green : C.white,
                color: active ? C.white : C.muted,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: F.body,
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {cat}{" "}
              <span style={{ opacity: 0.7 }}>
                {catEarned}/{catTotal}
              </span>
            </button>
          );
        })}
      </div>

      {/* Badge grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        {visible.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} data={data} />
        ))}
      </div>

      {earned === total && (
        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            padding: "20px",
            background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              fontFamily: F.heading,
              fontSize: 24,
              color: C.white,
              marginBottom: 6,
            }}
          >
            🏆 Complete Collection!
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            You've earned every badge. Absolute legend status.
          </div>
        </div>
      )}
    </div>
  );
}
