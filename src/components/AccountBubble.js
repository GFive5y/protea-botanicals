// src/components/AccountBubble.js — v1.0
// Account bubble popout for TenantPortal sidebar.
// Click the AD circle → opens above the strip (expanded)
//                     → opens to the right (collapsed)
// Shows: identity, AI usage meter, quick actions (coming soon), sign out.
// Sign out: supabase.auth.signOut() + clear localStorage → navigate /account

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useTenantConfig } from "../hooks/useTenantConfig";

const T = {
  accent:    "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  ink900:    "#0D0D0D",
  ink500:    "#474747",
  ink400:    "#6B6B6B",
  ink300:    "#999999",
  ink150:    "#E2E2E2",
  border:    "#ECEAE6",
  danger:    "#991B1B",
  font:      "'Inter','Helvetica Neue',Arial,sans-serif",
};

const PROFILE_BADGE = {
  cannabis_retail:     { label: "Cannabis Retail",    color: "#2D6A4F", bg: "#E8F5EE" },
  cannabis_dispensary: { label: "Cannabis Dispensary", color: "#166534", bg: "#F0FDF4" },
  nicotine_retail:     { label: "Nicotine Retail",    color: "#1E3A5F", bg: "#EFF6FF" },
  food_beverage:       { label: "Food & Beverage",    color: "#92400E", bg: "#FFFBEB" },
  general_retail:      { label: "General Retail",     color: "#374151", bg: "#F9FAFB" },
  mixed_retail:        { label: "Mixed Retail",       color: "#6B21A8", bg: "#FAF5FF" },
  operator:            { label: "Operator",            color: "#991B1B", bg: "#FEF2F2" },
};

const TIER_BADGE = {
  entry:    { label: "Entry",    color: "#6B6B6B", bg: "#F4F4F3" },
  standard: { label: "Standard", color: "#1E3A5F", bg: "#EFF6FF" },
  premium:  { label: "Premium",  color: "#92400E", bg: "#FFFBEB" },
};

export default function AccountBubble({
  tenantId,
  tenantName,
  industryProfile,
  role,
  currentUser,
  collapsed,
  anchorRect,
  onClose,
}) {
  const navigate = useNavigate();
  const { dailyLimit, tier } = useTenantConfig();
  const [aiUsed, setAiUsed]       = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  // Fetch today's AI usage count
  useEffect(() => {
    if (!tenantId) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("ai_usage_log")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59.999`)
      .then(({ count }) => setAiUsed(count ?? 0));
  }, [tenantId]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    localStorage.removeItem("protea_role");
    localStorage.removeItem("protea_dev_mode");
    navigate("/account");
  };

  const initials      = currentUser?.email ? currentUser.email.slice(0, 2).toUpperCase() : "??";
  const email         = currentUser?.email || "";
  const displayName   = email.split("@")[0] || "Account";
  const profileBadge  = PROFILE_BADGE[industryProfile] || PROFILE_BADGE.general_retail;
  const tierBadge     = TIER_BADGE[tier] || TIER_BADGE.entry;
  const aiPct         = dailyLimit > 0 && aiUsed !== null ? Math.min((aiUsed / dailyLimit) * 100, 100) : 0;
  const aiBarColor    = aiPct > 80 ? "#991B1B" : aiPct > 50 ? "#92400E" : T.accentMid;

  const content = (
    <>
      {/* ── Identity ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: T.accentMid, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
          flexShrink: 0, fontFamily: T.font,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: T.ink900, fontFamily: T.font,
            marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {displayName}
          </div>
          <div style={{
            fontSize: 10, color: T.ink400, fontFamily: T.font,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {email}
          </div>
        </div>
      </div>

      {/* Role + profile + tier badges */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
          padding: "2px 6px", borderRadius: 3, background: T.accentLit,
          color: T.accentMid, fontFamily: T.font,
        }}>
          {role || "admin"}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
          padding: "2px 6px", borderRadius: 3, background: profileBadge.bg,
          color: profileBadge.color, fontFamily: T.font,
        }}>
          {profileBadge.label}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
          padding: "2px 6px", borderRadius: 3, background: tierBadge.bg,
          color: tierBadge.color, fontFamily: T.font,
        }}>
          {tierBadge.label}
        </span>
      </div>

      {/* ── Divider ──────────────────────────────────────── */}
      <div style={{ height: "0.5px", background: T.border, margin: "0 0 10px" }} />

      {/* ── AI usage meter ───────────────────────────────── */}
      {dailyLimit > 0 && (
        <>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 6,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: T.ink500, fontFamily: T.font,
            }}>
              AI today
            </span>
            <span style={{
              fontSize: 10, color: T.ink400, fontFamily: T.font,
              fontVariantNumeric: "tabular-nums",
            }}>
              {aiUsed !== null ? aiUsed : "\u2026"} / {dailyLimit}
            </span>
          </div>
          <div style={{
            height: 3, borderRadius: 2, background: T.ink150,
            overflow: "hidden", marginBottom: 12,
          }}>
            <div style={{
              height: "100%", borderRadius: 2,
              background: aiBarColor,
              width: `${aiPct}%`,
              transition: "width 0.6s ease",
            }} />
          </div>
          <div style={{ height: "0.5px", background: T.border, margin: "0 0 2px" }} />
        </>
      )}

      {/* ── Quick actions (coming soon) ───────────────────── */}
      {[
        { icon: "\u2699", label: "Settings" },
        { icon: "\u25CE", label: "Help & support" },
        { icon: "\u2726", label: "What's new" },
      ].map(({ icon, label }) => (
        <div
          key={label}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 2px", opacity: 0.42, cursor: "not-allowed",
          }}
        >
          <span style={{
            fontSize: 12, color: T.ink500, fontFamily: T.font,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 11, color: T.ink400 }}>{icon}</span>
            {label}
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", color: T.ink300, fontFamily: T.font,
          }}>
            soon
          </span>
        </div>
      ))}

      {/* ── Divider ──────────────────────────────────────── */}
      <div style={{ height: "0.5px", background: T.border, margin: "6px 0 2px" }} />

      {/* ── Sign out ─────────────────────────────────────── */}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 2px",
          background: "transparent", border: "none",
          cursor: signingOut ? "default" : "pointer",
          fontFamily: T.font, fontSize: 12,
          color: signingOut ? T.ink300 : T.danger,
          textAlign: "left", borderRadius: 4,
          opacity: signingOut ? 0.6 : 1,
          transition: "background 0.12s",
        }}
        onMouseEnter={e => { if (!signingOut) e.currentTarget.style.background = "#FEF2F2"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{ fontSize: 11 }}>{"\u21A9"}</span>
        {signingOut ? "Signing out\u2026" : "Sign out"}
      </button>
    </>
  );

  // ── COLLAPSED: fixed bubble to the right of the strip ──────────────
  if (collapsed && anchorRect) {
    return (
      <div
        id="tp-acct-bubble"
        style={{
          position: "fixed",
          bottom: window.innerHeight - anchorRect.top + 8,
          left: anchorRect.right + 8,
          width: 220,
          background: "#fff",
          border: `0.5px solid ${T.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          zIndex: 10000,
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
        }}
      >
        <div style={{
          position: "absolute", left: -5, top: "50%",
          transform: "translateY(-50%) rotate(45deg)",
          width: 8, height: 8, background: "#fff",
          borderLeft: `0.5px solid ${T.border}`,
          borderBottom: `0.5px solid ${T.border}`,
        }} />
        {content}
      </div>
    );
  }

  // ── EXPANDED: absolute bubble above the account strip ──────────────
  return (
    <div
      id="tp-acct-bubble"
      style={{
        position: "absolute",
        bottom: "100%",
        left: 8, right: 8,
        background: "#fff",
        border: `0.5px solid ${T.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        zIndex: 250,
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        marginBottom: 4,
      }}
    >
      {content}
    </div>
  );
}
