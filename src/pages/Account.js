// src/pages/Account.js — Protea Botanicals v6.1
// ============================================================================
// v6.1 — WP-O Loyalty Engine Integration
//
//   CHANGES from v6.0:
//     - AccountView: loads loyalty_config (pts_referral_referrer/referee)
//     - AccountView: loads/generates referral code from referral_codes table
//     - Earn Rewards tab: referral code card with copy + WhatsApp share
//     - Earn Rewards tab: tier multiplier shown in profile completion summary
//     - No other changes — all v6.0 functionality preserved exactly
//
//   TIER 1 — My Details (always accessible)
//   TIER 2 — Earn Rewards (OTP phone verification required)
//   ADMIN CONFIG PANEL (admin role only)
//   TABS: Details | Earn Rewards | Inbox | Activity
// ============================================================================

import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { RoleContext } from "../App";
import ClientHeader from "../components/ClientHeader";
import CustomerInbox, {
  getInboxUnreadCount,
} from "../components/CustomerInbox";

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
  lightRed: "#fdf0ef",
  blue: "#2c4a6e",
  lightBlue: "#eaf0f8",
  platinum: "#7b68ee",
  lightGreen: "#eafaf1",
  lightGold: "#fef9e7",
  bg: "#f4f0e8",
};
const F = {
  heading: "'Cormorant Garamond',Georgia,serif",
  body: "'Jost','Helvetica Neue',sans-serif",
};

const DEFAULT_CONFIG = {
  phone_verified: {
    label: "Phone Verification",
    points: 50,
    icon: "📱",
    why: "Secures your account and enables WhatsApp prize notifications",
    required: true,
  },
  date_of_birth: {
    label: "Date of Birth",
    points: 20,
    icon: "🎂",
    why: "We'll surprise you with birthday bonus points every year",
  },
  gender: {
    label: "Gender",
    points: 10,
    icon: "👤",
    why: "Helps us personalise product recommendations for you",
  },
  preferred_type: {
    label: "Preferred Product",
    points: 20,
    icon: "🌿",
    why: "Get first access to new drops that match your preferences",
  },
  acquisition_channel: {
    label: "How You Found Us",
    points: 15,
    icon: "📣",
    why: "Helps us reach more like-minded people — you get points!",
  },
  province: {
    label: "Province",
    points: 15,
    icon: "📍",
    why: "See events, pop-ups and stockists near you",
  },
  city: {
    label: "City",
    points: 10,
    icon: "🏙",
    why: "Find your nearest Protea Botanicals stockist",
  },
  geolocation_consent: {
    label: "Location Tracking",
    points: 50,
    icon: "🗺",
    why: "Earn bonus points every time you scan near a participating store",
  },
  marketing_opt_in: {
    label: "Marketing Opt-in",
    points: 15,
    icon: "📧",
    why: "Be the first to hear about new releases, promotions and events",
  },
  analytics_opt_in: {
    label: "App Analytics",
    points: 10,
    icon: "📊",
    why: "Help us improve the app — your feedback shapes our product",
  },
};

const SA_PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "Northern Cape",
];
const PREFERRED_TYPES = [
  "",
  "Vape",
  "Tincture",
  "Edible",
  "Topical",
  "Capsule",
  "Raw Extract",
  "Other",
];
const ACQUISITION_CHANNELS = [
  "",
  "Friend/Family",
  "Instagram",
  "Google",
  "Dispensary",
  "Event",
  "Doctor",
  "Other",
];

function loadConfig() {
  try {
    const saved = localStorage.getItem("protea_points_config");
    return saved
      ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) }
      : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function ensureProfile(userId) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error && error.code === "PGRST116") {
    const { data: created } = await supabase
      .from("user_profiles")
      .insert({ id: userId, role: "customer", loyalty_points: 0 })
      .select("*")
      .single();
    return created;
  }
  return data;
}

function getTier(pts) {
  if (pts >= 1000)
    return {
      label: "Platinum",
      color: C.platinum,
      icon: "💎",
      next: null,
      nextAt: null,
      mult: 2.0,
    };
  if (pts >= 500)
    return {
      label: "Gold",
      color: C.gold,
      icon: "🥇",
      next: "Platinum",
      nextAt: 1000,
      mult: 1.5,
    };
  if (pts >= 200)
    return {
      label: "Silver",
      color: "#8e9ba8",
      icon: "🥈",
      next: "Gold",
      nextAt: 500,
      mult: 1.25,
    };
  return {
    label: "Bronze",
    color: "#a0674b",
    icon: "🥉",
    next: "Silver",
    nextAt: 200,
    mult: 1.0,
  };
}

function fmtTime(ts) {
  if (!ts) return "—";
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });
}

const inp = {
  width: "100%",
  padding: "11px 14px",
  border: `1px solid ${C.border}`,
  borderRadius: 3,
  fontSize: 14,
  fontFamily: F.body,
  background: C.white,
  color: C.text,
  boxSizing: "border-box",
  outline: "none",
};
const btn = (bg = C.mid, color = C.white, disabled = false) => ({
  padding: "11px 22px",
  background: disabled ? "#ccc" : bg,
  color,
  border: "none",
  borderRadius: 3,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  fontFamily: F.body,
  cursor: disabled ? "not-allowed" : "pointer",
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN CONFIG MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function AdminConfigModal({ config, onSave, onClose }) {
  const [local, setLocal] = useState(() =>
    Object.entries(config).reduce(
      (acc, [k, v]) => ({ ...acc, [k]: { ...v } }),
      {},
    ),
  );
  const handleSave = () => {
    localStorage.setItem("protea_points_config", JSON.stringify(local));
    onSave(local);
    onClose();
  };
  const totalPossible = Object.values(local).reduce(
    (s, v) => s + (Number(v.points) || 0),
    0,
  );
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 3000,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: C.white,
          borderRadius: 4,
          width: 600,
          maxWidth: "95vw",
          maxHeight: "85vh",
          overflowY: "auto",
          zIndex: 3001,
          padding: 28,
          boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: F.heading,
                fontSize: 22,
                color: C.green,
                fontWeight: 700,
              }}
            >
              ⚙ Points Config
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
              Admin only · Changes saved to localStorage · Total possible:{" "}
              <strong>{totalPossible} pts</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              color: C.muted,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {Object.entries(local).map(([key, val]) => (
            <div
              key={key}
              style={{
                background: C.cream,
                borderRadius: 3,
                padding: "12px 16px",
                display: "grid",
                gridTemplateColumns: "2fr 1fr 80px",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    fontFamily: F.body,
                    marginBottom: 3,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {key}
                </div>
                <input
                  type="text"
                  value={val.label}
                  onChange={(e) =>
                    setLocal((l) => ({
                      ...l,
                      [key]: { ...l[key], label: e.target.value },
                    }))
                  }
                  style={{ ...inp, padding: "6px 10px", fontSize: 13 }}
                />
              </div>
              <input
                type="text"
                value={val.why}
                onChange={(e) =>
                  setLocal((l) => ({
                    ...l,
                    [key]: { ...l[key], why: e.target.value },
                  }))
                }
                style={{
                  ...inp,
                  padding: "6px 10px",
                  fontSize: 12,
                  gridColumn: "1 / span 2",
                  marginTop: 4,
                }}
                placeholder="Why copy..."
              />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
                  Points
                </div>
                <input
                  type="number"
                  min="0"
                  value={val.points}
                  onChange={(e) =>
                    setLocal((l) => ({
                      ...l,
                      [key]: { ...l[key], points: Number(e.target.value) },
                    }))
                  }
                  style={{
                    ...inp,
                    padding: "6px 8px",
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.gold,
                    textAlign: "center",
                    width: 70,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button onClick={handleSave} style={btn(C.green)}>
            💾 Save Config
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("protea_points_config");
              onSave(DEFAULT_CONFIG);
              onClose();
            }}
            style={btn("#f0ebe3", C.muted)}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OTP VERIFICATION PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function OTPPanel({ currentPhone, userId, onVerified, config }) {
  const [phase, setPhase] = useState("intro");
  const [phone, setPhone] = useState(currentPhone || "");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!otpExpiry) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((otpExpiry - Date.now()) / 1000),
      );
      setCountdown(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        setGeneratedOtp(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [otpExpiry]);

  const sendOtp = async () => {
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    setSending(true);
    setError("");
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "whatsapp",
          trigger: "otp_verification",
          recipient: { phone: phone.trim() },
          data: {
            message: `🌿 *Protea Botanicals*\n\nYour verification code is: *${code}*\n\nValid for 5 minutes. Do not share this code with anyone.`,
          },
        }),
      });
    } catch {
      /* non-blocking */
    }
    setGeneratedOtp(code);
    setOtpExpiry(Date.now() + 5 * 60 * 1000);
    setCountdown(300);
    console.log(
      `%c🔑 OTP CODE: ${code}`,
      "font-size:20px;color:green;font-weight:bold;background:#e8f5e9;padding:8px 16px;border-radius:4px",
    );
    await supabase
      .from("user_profiles")
      .update({ phone: phone.trim() })
      .eq("id", userId);
    setPhase("enter_otp");
    setSending(false);
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (!generatedOtp) {
      setError("Code expired — please request a new one.");
      return;
    }
    if (otp.trim() !== generatedOtp) {
      setError("Incorrect code. Please try again.");
      return;
    }
    setVerifying(true);
    const { error: dbErr } = await supabase
      .from("user_profiles")
      .update({ phone_verified: true, phone: phone.trim() })
      .eq("id", userId);
    if (dbErr) {
      setError(`Verification failed: ${dbErr.message}`);
      setVerifying(false);
      return;
    }
    const ptsToAward = config.phone_verified?.points || 50;
    const { data: currentProfile } = await supabase
      .from("user_profiles")
      .select("loyalty_points")
      .eq("id", userId)
      .single();
    const newPts = (currentProfile?.loyalty_points || 0) + ptsToAward;
    await supabase
      .from("user_profiles")
      .update({ loyalty_points: newPts })
      .eq("id", userId);
    await supabase
      .from("loyalty_transactions")
      .insert({
        user_id: userId,
        points: ptsToAward,
        transaction_type: "PROFILE_COMPLETION",
        description: `Phone verified — +${ptsToAward} bonus points`,
        transaction_date: new Date().toISOString(),
      });
    setPhase("success");
    setVerifying(false);
    setTimeout(() => onVerified(ptsToAward, phone.trim()), 1500);
  };

  const totalPossible = Object.values(config).reduce((s, v) => s + v.points, 0);

  if (phase === "intro")
    return (
      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2
          style={{
            fontFamily: F.heading,
            fontSize: 28,
            color: C.green,
            margin: "0 0 12px",
          }}
        >
          Join the Rewards Programme
        </h2>
        <p
          style={{
            fontSize: 14,
            color: C.muted,
            lineHeight: 1.8,
            maxWidth: 480,
            margin: "0 auto 24px",
          }}
        >
          Earn up to{" "}
          <strong style={{ color: C.gold }}>
            {totalPossible} bonus points
          </strong>{" "}
          by completing your rewards profile. In exchange for sharing a little
          more about yourself, you unlock exclusive perks, birthday gifts, and
          early access to new drops.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            maxWidth: 420,
            margin: "0 auto 28px",
          }}
        >
          {[
            { icon: "🎂", title: "Birthday Gift", sub: "Points every year" },
            { icon: "🗺", title: "Local Events", sub: "Near you" },
            { icon: "🌿", title: "Early Access", sub: "New products" },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: C.lightGreen,
                borderRadius: 3,
                padding: "14px 10px",
                border: `1px solid ${C.accent}30`,
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>{item.sub}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
          🔒 Requires phone verification. Your data is protected under POPIA.
        </p>
        <button onClick={() => setPhase("enter_phone")} style={btn(C.green)}>
          📱 Verify Phone to Get Started
        </button>
      </div>
    );

  if (phase === "enter_phone")
    return (
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
          <h3
            style={{
              fontFamily: F.heading,
              fontSize: 24,
              color: C.green,
              margin: "0 0 8px",
            }}
          >
            Verify Your Phone
          </h3>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            We'll send a 6-digit code via WhatsApp.
          </p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 6,
            }}
          >
            WhatsApp Number
          </label>
          <input
            type="tel"
            placeholder="+27 82 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendOtp()}
            style={{ ...inp, fontSize: 16 }}
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
            Include country code, e.g. +27 for South Africa
          </div>
        </div>
        {error && (
          <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>
            ⚠ {error}
          </div>
        )}
        <button
          onClick={sendOtp}
          disabled={sending}
          style={{ ...btn(C.green, C.white, sending), width: "100%" }}
        >
          {sending ? "Sending code…" : "Send Verification Code"}
        </button>
        <button
          onClick={() => setPhase("intro")}
          style={{ ...btn("#f0ebe3", C.muted), width: "100%", marginTop: 10 }}
        >
          ← Back
        </button>
      </div>
    );

  if (phase === "enter_otp")
    return (
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <h3
            style={{
              fontFamily: F.heading,
              fontSize: 24,
              color: C.green,
              margin: "0 0 8px",
            }}
          >
            Enter Your Code
          </h3>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            Code sent to <strong>{phone}</strong> via WhatsApp.
            {countdown > 0 && (
              <span style={{ color: C.gold }}>
                {" "}
                Expires in {Math.floor(countdown / 60)}:
                {String(countdown % 60).padStart(2, "0")}
              </span>
            )}
          </p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.muted,
              marginBottom: 6,
            }}
          >
            6-Digit Code
          </label>
          <input
            type="text"
            maxLength={6}
            placeholder="_ _ _ _ _ _"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
            style={{
              ...inp,
              fontSize: 28,
              letterSpacing: "0.4em",
              textAlign: "center",
              fontWeight: 700,
            }}
          />
        </div>
        {error && (
          <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>
            ⚠ {error}
          </div>
        )}
        <button
          onClick={verifyOtp}
          disabled={verifying || !otp}
          style={{ ...btn(C.green, C.white, verifying || !otp), width: "100%" }}
        >
          {verifying ? "Verifying…" : "Verify & Unlock Rewards"}
        </button>
        {countdown === 0 ? (
          <button
            onClick={sendOtp}
            style={{ ...btn(C.mid), width: "100%", marginTop: 10 }}
          >
            Resend Code
          </button>
        ) : (
          <button
            onClick={() => setPhase("enter_phone")}
            style={{ ...btn("#f0ebe3", C.muted), width: "100%", marginTop: 10 }}
          >
            Change Number
          </button>
        )}
      </div>
    );

  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h3
        style={{
          fontFamily: F.heading,
          fontSize: 28,
          color: C.green,
          margin: "0 0 10px",
        }}
      >
        Phone Verified!
      </h3>
      <div style={{ fontSize: 16, color: C.gold, fontWeight: 700 }}>
        +{config.phone_verified?.points || 50} pts added to your account
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REWARD FIELD ROW
// ═══════════════════════════════════════════════════════════════════════════════
function RewardField({ fieldKey, config, profile, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const cfg = config[fieldKey];
  if (!cfg) return null;

  const getFieldValue = () => {
    switch (fieldKey) {
      case "date_of_birth":
        return profile.date_of_birth;
      case "gender":
        return profile.gender;
      case "preferred_type":
        return profile.preferred_type;
      case "acquisition_channel":
        return profile.acquisition_channel;
      case "province":
        return profile.province;
      case "city":
        return profile.city;
      case "geolocation_consent":
        return profile.geolocation_consent ? "yes" : null;
      case "marketing_opt_in":
        return profile.marketing_opt_in ? "yes" : null;
      case "analytics_opt_in":
        return profile.analytics_opt_in ? "yes" : null;
      default:
        return null;
    }
  };

  const currentValue = getFieldValue();
  const earned = !!currentValue;
  const handleEdit = () => {
    setValue(currentValue && currentValue !== "yes" ? currentValue : "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const wasEmpty = !earned;
    let updatePayload = {};
    const boolField = [
      "geolocation_consent",
      "marketing_opt_in",
      "analytics_opt_in",
    ].includes(fieldKey);
    if (boolField) {
      updatePayload = { [fieldKey]: true };
    } else {
      if (!value.trim()) {
        setSaving(false);
        return;
      }
      updatePayload = { [fieldKey]: value.trim() };
    }
    await onSave(updatePayload, wasEmpty ? cfg.points : 0, cfg.label);
    setEditing(false);
    setSaving(false);
    if (wasEmpty) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const renderInput = () => {
    switch (fieldKey) {
      case "province":
        return (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ ...inp, width: "auto", minWidth: 200 }}
          >
            <option value="">Select province…</option>
            {SA_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        );
      case "preferred_type":
        return (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ ...inp, width: "auto", minWidth: 200 }}
          >
            {PREFERRED_TYPES.map((p) => (
              <option key={p} value={p}>
                {p || "Select type…"}
              </option>
            ))}
          </select>
        );
      case "acquisition_channel":
        return (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ ...inp, width: "auto", minWidth: 200 }}
          >
            {ACQUISITION_CHANNELS.map((a) => (
              <option key={a} value={a}>
                {a || "Select…"}
              </option>
            ))}
          </select>
        );
      case "date_of_birth":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ ...inp, width: "auto" }}
          />
        );
      case "gender":
        return (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ ...inp, width: "auto", minWidth: 160 }}
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
        );
      case "geolocation_consent":
      case "marketing_opt_in":
      case "analytics_opt_in":
        return null;
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ ...inp, width: "auto", minWidth: 200 }}
            placeholder={`Enter ${cfg.label.toLowerCase()}…`}
          />
        );
    }
  };

  const isBool = [
    "geolocation_consent",
    "marketing_opt_in",
    "analytics_opt_in",
  ].includes(fieldKey);

  return (
    <div
      style={{
        background: earned ? C.lightGreen : C.white,
        border: `1px solid ${earned ? C.accent + "50" : C.border}`,
        borderLeft: `4px solid ${earned ? C.accent : C.border}`,
        borderRadius: 3,
        padding: "16px 20px",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>
          {cfg.icon}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {cfg.label}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: earned ? C.accent : C.gold,
                background: earned ? C.lightGreen : C.lightGold,
                border: `1px solid ${earned ? C.accent + "40" : C.gold + "40"}`,
                padding: "2px 8px",
                borderRadius: 10,
              }}
            >
              {earned ? `✓ +${cfg.points} pts earned` : `+${cfg.points} pts`}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            {cfg.why}
          </div>
          {earned && !isBool && (
            <div
              style={{
                fontSize: 13,
                color: C.mid,
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              {currentValue}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {saved && (
            <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>
              ✓ Saved!
            </span>
          )}
          {!editing ? (
            earned ? (
              <button
                onClick={handleEdit}
                style={{
                  ...btn("#f0ebe3", C.muted),
                  fontSize: 9,
                  padding: "5px 12px",
                }}
              >
                Edit
              </button>
            ) : isBool ? (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...btn(C.gold, C.white, saving),
                  fontSize: 10,
                  padding: "7px 14px",
                }}
              >
                {saving ? "Saving…" : "Opt In & Earn"}
              </button>
            ) : (
              <button
                onClick={handleEdit}
                style={{
                  ...btn(C.gold, C.white),
                  fontSize: 10,
                  padding: "7px 14px",
                }}
              >
                + Add & Earn
              </button>
            )
          ) : (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {renderInput()}
              <button
                onClick={handleSave}
                disabled={saving}
                style={btn(C.green, C.white, saving)}
              >
                {saving ? "…" : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                style={btn("#f0ebe3", C.muted)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT VIEW
// ═══════════════════════════════════════════════════════════════════════════════
function AccountView({
  user,
  profile: initialProfile,
  role,
  onSignOut,
  onProfileUpdate,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(initialProfile || {});
  const [activeTab, setActiveTab] = useState(location.state?.tab || "details");
  const [config, setConfig] = useState(loadConfig);
  const [showConfig, setShowConfig] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [detailsForm, setDetailsForm] = useState(null);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsMsg, setDetailsMsg] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [scansLoading, setScansLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // ── v6.1: WP-O additions ─────────────────────────────────────────────────────
  const [loyaltyConfig, setLoyaltyConfig] = useState({
    pts_referral_referrer: 100,
    pts_referral_referee: 50,
  });
  const [referralCode, setReferralCode] = useState(null);
  const [referralUses, setReferralUses] = useState(0);
  const [refCopied, setRefCopied] = useState(false);

  const isAdmin = role === "admin" || role === "hq";

  useEffect(() => {
    getInboxUnreadCount(user.id).then((n) => setInboxUnread(n));
  }, [user.id]);

  const loadScans = useCallback(async () => {
    setScansLoading(true);
    const { data } = await supabase
      .from("scan_logs")
      .select(
        "id,scanned_at,qr_type,scan_outcome,points_awarded,ip_city,ip_province,campaign_name",
      )
      .eq("user_id", user.id)
      .order("scanned_at", { ascending: false })
      .limit(50);
    setScanHistory(data || []);
    setScansLoading(false);
  }, [user.id]);

  useEffect(() => {
    if (activeTab === "activity") loadScans();
  }, [activeTab, loadScans]);

  // v6.1: load loyalty config + referral code
  useEffect(() => {
    async function loadRewardsMeta() {
      // Fetch loyalty config (pts for referral display)
      const { data: cfg } = await supabase
        .from("loyalty_config")
        .select(
          "pts_referral_referrer,pts_referral_referee,mult_bronze,mult_silver,mult_gold,mult_platinum",
        )
        .single();
      if (cfg) setLoyaltyConfig(cfg);

      // Load or generate referral code
      let code = profile.referral_code;
      if (!code) {
        // Check referral_codes table first
        const { data: existing } = await supabase
          .from("referral_codes")
          .select("code, uses_count")
          .eq("owner_id", user.id)
          .eq("is_active", true)
          .single();
        if (existing) {
          code = existing.code;
          setReferralUses(existing.uses_count || 0);
          // Backfill user_profiles.referral_code
          await supabase
            .from("user_profiles")
            .update({ referral_code: code })
            .eq("id", user.id);
        } else {
          // Generate new code
          const name =
            (profile.full_name || "USER")
              .split(" ")[0]
              .toUpperCase()
              .replace(/[^A-Z]/g, "")
              .slice(0, 6) || "USER";
          let newCode = name + Math.floor(Math.random() * 90 + 10);
          let attempts = 0;
          while (attempts < 5) {
            const { error: insertErr } = await supabase
              .from("referral_codes")
              .insert({ code: newCode, owner_id: user.id });
            if (!insertErr) {
              await supabase
                .from("user_profiles")
                .update({ referral_code: newCode })
                .eq("id", user.id);
              code = newCode;
              break;
            }
            newCode = name + Math.floor(Math.random() * 900 + 100);
            attempts++;
          }
        }
      } else {
        const { data: refData } = await supabase
          .from("referral_codes")
          .select("uses_count")
          .eq("code", code)
          .single();
        setReferralUses(refData?.uses_count || 0);
      }
      setReferralCode(code || null);
    }
    if (profile && user && profile.phone_verified) loadRewardsMeta();
  }, [profile.phone_verified, user.id]); // eslint-disable-line

  const showToast = (msg, color = C.accent) => {
    setToastMsg({ msg, color });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // v6.1: referral helpers
  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => {
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    });
  };
  const shareReferralWhatsApp = () => {
    if (!referralCode) return;
    const msg = `🌿 Hey! I use Protea Botanicals' loyalty programme and earn great rewards. Sign up with my referral code *${referralCode}* at checkout and you'll get ${loyaltyConfig.pts_referral_referee} bonus points on your first order! 👉 https://proteabotanicals.co.za`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleSaveDetails = async () => {
    if (!detailsForm) return;
    setDetailsSaving(true);
    setDetailsMsg(null);
    const payload = {
      full_name: detailsForm.full_name || null,
      phone: detailsForm.phone || null,
      street_address: detailsForm.street_address || null,
      suburb: detailsForm.suburb || null,
      postal_code: detailsForm.postal_code || null,
      city: detailsForm.city || null,
      province: detailsForm.province || null,
      preferred_contact: detailsForm.preferred_contact || "email",
    };
    const { data: savedRow, error } = await supabase
      .from("user_profiles")
      .update(payload)
      .eq("id", user.id)
      .select("*")
      .single();
    if (error) {
      setDetailsMsg({ error: `Save failed: ${error.message}` });
    } else {
      const updated = savedRow
        ? { ...profile, ...savedRow }
        : { ...profile, ...payload };
      setProfile(updated);
      onProfileUpdate?.(updated);
      setDetailsForm(null);
      setDetailsMsg({ success: "Details saved!" });
      setTimeout(() => setDetailsMsg(null), 3000);
    }
    setDetailsSaving(false);
  };

  const handleRewardSave = async (payload, pointsToAward, fieldLabel) => {
    const { data: savedRow, error } = await supabase
      .from("user_profiles")
      .update(payload)
      .eq("id", user.id)
      .select("*")
      .single();
    if (error) {
      showToast(`Failed: ${error.message}`, C.red);
      return;
    }
    let updatedProfile = savedRow
      ? { ...profile, ...savedRow }
      : { ...profile, ...payload };
    if (pointsToAward > 0) {
      const newPts = (profile.loyalty_points || 0) + pointsToAward;
      await supabase
        .from("user_profiles")
        .update({ loyalty_points: newPts })
        .eq("id", user.id);
      await supabase
        .from("loyalty_transactions")
        .insert({
          user_id: user.id,
          points: pointsToAward,
          transaction_type: "PROFILE_COMPLETION",
          description: `Profile: ${fieldLabel} added`,
          transaction_date: new Date().toISOString(),
        });
      updatedProfile = { ...updatedProfile, loyalty_points: newPts };
      showToast(
        `🎉 +${pointsToAward} points earned for adding ${fieldLabel}!`,
        C.gold,
      );
    }
    setProfile(updatedProfile);
    onProfileUpdate?.(updatedProfile);
  };

  const handleOtpVerified = async (ptsAwarded, verifiedPhone) => {
    const { data: freshProfile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    const updated = freshProfile || {
      ...profile,
      phone_verified: true,
      phone: verifiedPhone,
    };
    setProfile(updated);
    onProfileUpdate?.(updated);
    showToast(`🎉 Phone verified! +${ptsAwarded} points awarded!`, C.gold);
  };

  const tier = getTier(profile.loyalty_points || 0);
  const rewardFields = Object.keys(config).filter(
    (k) => k !== "phone_verified",
  );
  const earnedFields = rewardFields.filter((k) => {
    switch (k) {
      case "date_of_birth":
        return !!profile.date_of_birth;
      case "gender":
        return !!profile.gender;
      case "preferred_type":
        return !!profile.preferred_type;
      case "acquisition_channel":
        return !!profile.acquisition_channel;
      case "province":
        return !!profile.province;
      case "city":
        return !!profile.city;
      case "geolocation_consent":
        return !!profile.geolocation_consent;
      case "marketing_opt_in":
        return !!profile.marketing_opt_in;
      case "analytics_opt_in":
        return !!profile.analytics_opt_in;
      default:
        return false;
    }
  });
  const totalEarnable = rewardFields.reduce(
    (s, k) => s + (config[k]?.points || 0),
    0,
  );
  const totalEarned = earnedFields.reduce(
    (s, k) => s + (config[k]?.points || 0),
    0,
  );
  const pctComplete =
    totalEarnable > 0 ? Math.round((totalEarned / totalEarnable) * 100) : 0;
  const isEditing = !!detailsForm;
  const df = detailsForm || profile;

  const TABS = [
    { id: "details", label: "📋 My Details" },
    {
      id: "rewards",
      label: `⭐ Earn Rewards${earnedFields.length < rewardFields.length ? " ●" : ""}`,
    },
    {
      id: "inbox",
      label: `📬 Inbox${inboxUnread > 0 ? ` (${inboxUnread})` : ""}`,
    },
    { id: "activity", label: "📱 Activity" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.cream,
        fontFamily: F.body,
        paddingBottom: 60,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .reward-tab-enter { animation: fadeIn 0.3s ease; }
        @media (max-width:500px) { .acct-tabs button { padding: 10px 10px !important; font-size: 9px !important; } }
      `}</style>

      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: toastMsg.color,
            color: C.white,
            padding: "12px 24px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 4000,
            fontFamily: F.body,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
          }}
        >
          {toastMsg.msg}
        </div>
      )}

      <div style={{ maxWidth: 660, margin: "0 auto", padding: "32px 16px 0" }}>
        {/* ── HEADER CARD ── */}
        <div
          style={{
            background: C.green,
            borderRadius: 4,
            padding: "24px 28px",
            marginBottom: 24,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -20,
              top: -20,
              fontSize: 120,
              opacity: 0.04,
              lineHeight: 1,
            }}
          >
            🌿
          </div>
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
            Protea Botanicals
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: F.heading,
                  fontSize: 28,
                  color: C.white,
                  fontWeight: 600,
                }}
              >
                {profile.full_name || "My Account"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.6)",
                  marginTop: 2,
                }}
              >
                {user.email}
              </div>
              {profile.phone_verified && (
                <div
                  style={{
                    fontSize: 11,
                    color: C.accent,
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  ✅ Loyalty Member · Phone Verified
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: `${tier.color}20`,
                  border: `1px solid ${tier.color}50`,
                  borderRadius: 20,
                  padding: "5px 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: tier.color,
                  marginBottom: 6,
                }}
              >
                {tier.icon} {tier.label}
                {tier.mult > 1 && (
                  <span
                    style={{
                      fontSize: 9,
                      background: `${tier.color}30`,
                      padding: "1px 6px",
                      borderRadius: 8,
                      marginLeft: 4,
                    }}
                  >
                    {tier.mult}×
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: F.heading,
                  fontSize: 32,
                  color: C.white,
                  lineHeight: 1,
                }}
              >
                {(profile.loyalty_points || 0).toLocaleString()}
                <span
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.6)",
                    marginLeft: 4,
                  }}
                >
                  pts
                </span>
              </div>
              {tier.next && (
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 4,
                  }}
                >
                  {tier.nextAt - (profile.loyalty_points || 0)} pts to{" "}
                  {tier.next}
                </div>
              )}
            </div>
          </div>
          {tier.next && (
            <div
              style={{
                marginTop: 14,
                height: 3,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 3,
                  background: tier.color,
                  width: `${Math.min(100, ((profile.loyalty_points || 0) / tier.nextAt) * 100)}%`,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          )}
        </div>

        {/* ── TABS ── */}
        <div
          className="acct-tabs"
          style={{
            display: "flex",
            background: C.white,
            borderRadius: "3px 3px 0 0",
            borderBottom: `2px solid ${C.border}`,
            overflowX: "auto",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "12px 18px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: F.body,
                cursor: "pointer",
                border: "none",
                background: "none",
                whiteSpace: "nowrap",
                color: activeTab === t.id ? C.green : C.muted,
                borderBottom:
                  activeTab === t.id
                    ? `3px solid ${C.green}`
                    : "3px solid transparent",
                marginBottom: -2,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderTop: "none",
            borderRadius: "0 0 4px 4px",
            padding: "24px 24px 32px",
            marginBottom: 16,
          }}
        >
          {/* ══ DETAILS TAB ══ */}
          {activeTab === "details" && (
            <div className="reward-tab-enter">
              <div
                style={{
                  background: "#edf7f2",
                  border: `1px solid ${C.accent}30`,
                  borderRadius: 3,
                  padding: "12px 16px",
                  marginBottom: 22,
                  fontSize: 13,
                  color: C.mid,
                  lineHeight: 1.6,
                }}
              >
                📋 <strong>Order &amp; Delivery Details</strong> — These are the
                basics we need to process your orders and get in touch. No
                loyalty required.
              </div>
              {detailsMsg?.success && (
                <div
                  style={{
                    background: C.lightGreen,
                    border: `1px solid ${C.accent}`,
                    borderRadius: 3,
                    padding: "10px 14px",
                    marginBottom: 16,
                    fontSize: 13,
                    color: C.mid,
                    fontWeight: 600,
                  }}
                >
                  ✅ {detailsMsg.success}
                </div>
              )}
              {detailsMsg?.error && (
                <div
                  style={{
                    background: C.lightRed,
                    border: `1px solid ${C.red}`,
                    borderRadius: 3,
                    padding: "10px 14px",
                    marginBottom: 16,
                    fontSize: 13,
                    color: C.red,
                  }}
                >
                  ⚠ {detailsMsg.error}
                </div>
              )}

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.muted,
                  marginBottom: 14,
                }}
              >
                Personal
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px 16px",
                  marginBottom: 22,
                }}
              >
                {[
                  { field: "full_name", label: "Full Name", type: "text" },
                  { field: "phone", label: "Phone / WhatsApp", type: "tel" },
                ].map((f) => (
                  <div key={f.field}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        color: C.muted,
                        marginBottom: 5,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {f.label}
                    </label>
                    {isEditing ? (
                      <input
                        type={f.type}
                        value={df[f.field] || ""}
                        onChange={(e) =>
                          setDetailsForm((p) => ({
                            ...p,
                            [f.field]: e.target.value,
                          }))
                        }
                        style={inp}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 14,
                          color: df[f.field] ? C.text : C.muted,
                          padding: "11px 0",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {df[f.field] || "—"}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: C.muted,
                  marginBottom: 14,
                }}
              >
                Delivery Address
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px 16px",
                  marginBottom: 22,
                }}
              >
                <div style={{ gridColumn: "1 / span 2" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: C.muted,
                      marginBottom: 5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Street Address
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={df.street_address || ""}
                      onChange={(e) =>
                        setDetailsForm((p) => ({
                          ...p,
                          street_address: e.target.value,
                        }))
                      }
                      style={inp}
                      placeholder="e.g. 12 Main Street, Apartment 3"
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 14,
                        color: df.street_address ? C.text : C.muted,
                        padding: "11px 0",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {df.street_address || "—"}
                    </div>
                  )}
                </div>
                {[
                  { field: "suburb", label: "Suburb" },
                  { field: "postal_code", label: "Postal Code" },
                  { field: "city", label: "City / Town" },
                ].map((f) => (
                  <div key={f.field}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        color: C.muted,
                        marginBottom: 5,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {f.label}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={df[f.field] || ""}
                        onChange={(e) =>
                          setDetailsForm((p) => ({
                            ...p,
                            [f.field]: e.target.value,
                          }))
                        }
                        style={inp}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 14,
                          color: df[f.field] ? C.text : C.muted,
                          padding: "11px 0",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {df[f.field] || "—"}
                      </div>
                    )}
                  </div>
                ))}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: C.muted,
                      marginBottom: 5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                    }}
                  >
                    Province
                  </label>
                  {isEditing ? (
                    <select
                      value={df.province || ""}
                      onChange={(e) =>
                        setDetailsForm((p) => ({
                          ...p,
                          province: e.target.value,
                        }))
                      }
                      style={inp}
                    >
                      <option value="">Select…</option>
                      {SA_PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      style={{
                        fontSize: 14,
                        color: df.province ? C.text : C.muted,
                        padding: "11px 0",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      {df.province || "—"}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    color: C.muted,
                    marginBottom: 5,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  Preferred Contact
                </label>
                {isEditing ? (
                  <select
                    value={df.preferred_contact || "email"}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        preferred_contact: e.target.value,
                      }))
                    }
                    style={{ ...inp, width: "auto", minWidth: 160 }}
                  >
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                  </select>
                ) : (
                  <div style={{ fontSize: 14, color: C.text }}>
                    {df.preferred_contact || "Email"}
                  </div>
                )}
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setDetailsForm({ ...profile })}
                  style={btn(C.mid)}
                >
                  ✏ Edit Details
                </button>
              ) : (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={handleSaveDetails}
                    disabled={detailsSaving}
                    style={btn(C.green, C.white, detailsSaving)}
                  >
                    {detailsSaving ? "Saving…" : "💾 Save Details"}
                  </button>
                  <button
                    onClick={() => {
                      setDetailsForm(null);
                      setDetailsMsg(null);
                    }}
                    style={btn("#f0ebe3", C.muted)}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!profile.phone_verified && (
                <div
                  onClick={() => setActiveTab("rewards")}
                  style={{
                    marginTop: 24,
                    padding: "14px 18px",
                    background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
                    borderRadius: 3,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 2px 12px rgba(27,67,50,0.2)",
                  }}
                >
                  <span style={{ fontSize: 24 }}>⭐</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: C.white }}
                    >
                      Join the Rewards Programme
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.7)",
                        marginTop: 2,
                      }}
                    >
                      Earn up to{" "}
                      {totalEarnable + (config.phone_verified?.points || 50)}{" "}
                      bonus points by completing your profile →
                    </div>
                  </div>
                  <span
                    style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}
                  >
                    →
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ══ EARN REWARDS TAB ══ */}
          {activeTab === "rewards" && (
            <div className="reward-tab-enter">
              {!profile.phone_verified ? (
                <OTPPanel
                  currentPhone={profile.phone}
                  userId={user.id}
                  config={config}
                  onVerified={handleOtpVerified}
                />
              ) : (
                <>
                  {/* Progress summary */}
                  <div
                    style={{
                      background: C.lightGold,
                      border: `1px solid ${C.gold}30`,
                      borderRadius: 3,
                      padding: "16px 20px",
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: C.gold,
                          }}
                        >
                          Your Rewards Profile
                        </div>
                        <div
                          style={{
                            fontFamily: F.heading,
                            fontSize: 22,
                            color: C.text,
                            marginTop: 2,
                          }}
                        >
                          {earnedFields.length} of {rewardFields.length} fields
                          complete · {totalEarned} / {totalEarnable} pts earned
                        </div>
                        {tier.mult > 1 && (
                          <div
                            style={{
                              fontSize: 12,
                              color: tier.color,
                              marginTop: 4,
                              fontWeight: 600,
                            }}
                          >
                            ✦ {tier.label} tier: {tier.mult}× multiplier active
                            on all purchases
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontFamily: F.heading,
                            fontSize: 40,
                            color: C.gold,
                            lineHeight: 1,
                          }}
                        >
                          {pctComplete}%
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>
                          complete
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        height: 8,
                        background: "rgba(0,0,0,0.08)",
                        borderRadius: 4,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 4,
                          background: `linear-gradient(to right, ${C.gold}, ${C.accent})`,
                          width: `${pctComplete}%`,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                    {pctComplete === 100 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: C.mid,
                          marginTop: 8,
                          fontWeight: 600,
                        }}
                      >
                        🎉 Profile complete! Maximum rewards unlocked.
                      </div>
                    ) : (
                      <div
                        style={{ fontSize: 12, color: C.muted, marginTop: 8 }}
                      >
                        {totalEarnable - totalEarned} pts still to earn —
                        complete the fields below
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: C.lightBlue,
                      border: `1px solid ${C.blue}20`,
                      borderRadius: 3,
                      padding: "10px 14px",
                      marginBottom: 20,
                      fontSize: 12,
                      color: C.blue,
                      lineHeight: 1.6,
                    }}
                  >
                    🔒 <strong>Data exchange policy:</strong> Each field you
                    complete earns you real points you can spend on prizes. Your
                    data is protected under POPIA and is never sold to third
                    parties. You can remove any data at any time.
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    {rewardFields.map((k) => (
                      <RewardField
                        key={k}
                        fieldKey={k}
                        config={config}
                        profile={profile}
                        onSave={handleRewardSave}
                      />
                    ))}
                  </div>

                  {/* ── v6.1: REFERRAL CODE CARD ── */}
                  {referralCode && (
                    <div
                      style={{
                        marginTop: 20,
                        background: C.lightGold,
                        border: `1px solid ${C.gold}30`,
                        borderLeft: `4px solid ${C.gold}`,
                        borderRadius: 3,
                        padding: "18px 20px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          color: C.gold,
                          marginBottom: 4,
                        }}
                      >
                        Share & Earn
                      </div>
                      <div
                        style={{
                          fontFamily: F.heading,
                          fontSize: 18,
                          color: C.green,
                          marginBottom: 8,
                        }}
                      >
                        Your Referral Code
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: C.muted,
                          lineHeight: 1.6,
                          marginBottom: 14,
                        }}
                      >
                        Share your code with friends — you earn{" "}
                        <strong style={{ color: C.gold }}>
                          {loyaltyConfig.pts_referral_referrer} pts
                        </strong>{" "}
                        when they place their first order, and they get{" "}
                        <strong style={{ color: C.gold }}>
                          {loyaltyConfig.pts_referral_referee} pts
                        </strong>{" "}
                        as a welcome bonus.
                        {referralUses > 0 && (
                          <span
                            style={{
                              color: C.accent,
                              fontWeight: 600,
                              display: "block",
                              marginTop: 4,
                            }}
                          >
                            ✓ You've earned from {referralUses} referral
                            {referralUses !== 1 ? "s" : ""} so far!
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            background: "#f4f0e8",
                            border: "2px dashed #e8e0d4",
                            borderRadius: 4,
                            padding: "10px 20px",
                            fontFamily: "monospace",
                            fontSize: 20,
                            fontWeight: 700,
                            letterSpacing: "0.2em",
                            color: C.green,
                          }}
                        >
                          {referralCode}
                        </div>
                        <button
                          onClick={copyReferralCode}
                          style={{
                            ...btn(refCopied ? C.accent : C.mid),
                            fontSize: 10,
                            padding: "8px 16px",
                          }}
                        >
                          {refCopied ? "✓ Copied!" : "📋 Copy Code"}
                        </button>
                        <button
                          onClick={shareReferralWhatsApp}
                          style={{
                            padding: "8px 16px",
                            background: "#25D366",
                            color: C.white,
                            border: "none",
                            borderRadius: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            fontFamily: F.body,
                            cursor: "pointer",
                          }}
                        >
                          💬 Share via WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ INBOX TAB ══ */}
          {activeTab === "inbox" && (
            <div className="reward-tab-enter">
              <CustomerInbox
                userId={user.id}
                onUnreadChange={(n) => setInboxUnread(n)}
              />
            </div>
          )}

          {/* ══ ACTIVITY TAB ══ */}
          {activeTab === "activity" && (
            <div className="reward-tab-enter">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "Total Scans",
                    value: scanHistory.length,
                    color: C.green,
                  },
                  {
                    label: "Points Earned",
                    value: scanHistory.reduce(
                      (s, sc) => s + (sc.points_awarded || 0),
                      0,
                    ),
                    color: C.gold,
                  },
                  {
                    label: "Locations",
                    value: new Set(
                      scanHistory
                        .map((sc) => sc.ip_city || sc.ip_province)
                        .filter(Boolean),
                    ).size,
                    color: C.blue,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: C.cream,
                      borderTop: `3px solid ${s.color}`,
                      borderRadius: 3,
                      padding: "12px 14px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: C.muted,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontFamily: F.heading,
                        fontSize: 26,
                        color: s.color,
                      }}
                    >
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
              {scansLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px",
                    color: C.muted,
                  }}
                >
                  Loading activity…
                </div>
              ) : scanHistory.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    border: `1px dashed ${C.border}`,
                    borderRadius: 3,
                    color: C.muted,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📱</div>
                  <div
                    style={{
                      fontFamily: F.heading,
                      fontSize: 18,
                      color: C.green,
                      marginBottom: 6,
                    }}
                  >
                    No scans yet
                  </div>
                  <div style={{ fontSize: 13 }}>
                    Scan a Protea Botanicals QR code to start earning points!
                  </div>
                </div>
              ) : (
                <>
                  {scanHistory.some((sc) => sc.ip_city || sc.ip_province) && (
                    <div
                      style={{
                        background: C.lightGreen,
                        border: `1px solid ${C.accent}30`,
                        borderRadius: 3,
                        padding: "10px 14px",
                        marginBottom: 14,
                        fontSize: 13,
                        color: C.mid,
                      }}
                    >
                      📍 Your scans were detected from:{" "}
                      <strong>
                        {[
                          ...new Set(
                            scanHistory
                              .map((sc) => sc.ip_city || sc.ip_province)
                              .filter(Boolean),
                          ),
                        ]
                          .slice(0, 4)
                          .join(", ")}
                      </strong>
                    </div>
                  )}
                  <div style={{ display: "grid", gap: 0 }}>
                    {scanHistory.map((sc) => (
                      <div
                        key={sc.id}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: "12px 0",
                          borderBottom: `1px solid ${C.border}`,
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}
                        >
                          {sc.qr_type === "product_insert"
                            ? "📦"
                            : sc.qr_type === "promotional"
                              ? "📣"
                              : sc.qr_type === "event"
                                ? "🎪"
                                : "📱"}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: C.text,
                              }}
                            >
                              {sc.qr_type || "QR Scan"}
                              {sc.campaign_name ? ` · ${sc.campaign_name}` : ""}
                            </span>
                            <span style={{ fontSize: 11, color: C.muted }}>
                              {fmtTime(sc.scanned_at)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              marginTop: 5,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 7px",
                                borderRadius: 10,
                                background:
                                  sc.scan_outcome === "points_awarded"
                                    ? C.lightGreen
                                    : "#eee",
                                color:
                                  sc.scan_outcome === "points_awarded"
                                    ? C.accent
                                    : C.muted,
                                fontWeight: 700,
                              }}
                            >
                              {(sc.scan_outcome || "—").replace(/_/g, " ")}
                            </span>
                            {sc.points_awarded > 0 && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 7px",
                                  borderRadius: 10,
                                  background: C.lightGold,
                                  color: C.gold,
                                  fontWeight: 700,
                                }}
                              >
                                +{sc.points_awarded} pts
                              </span>
                            )}
                            {(sc.ip_city || sc.ip_province) && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 7px",
                                  borderRadius: 10,
                                  background: C.lightBlue,
                                  color: C.blue,
                                }}
                              >
                                📍 {sc.ip_city || sc.ip_province}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Nav shortcuts */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <button
            onClick={() => navigate("/loyalty")}
            style={{
              padding: "12px",
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.green,
              cursor: "pointer",
              fontFamily: F.body,
            }}
          >
            📊 View Loyalty
          </button>
          <button
            onClick={() => navigate("/shop")}
            style={{
              padding: "12px",
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 3,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.green,
              cursor: "pointer",
              fontFamily: F.body,
            }}
          >
            🛒 Browse Shop
          </button>
        </div>
        <div style={{ textAlign: "center", paddingTop: 12 }}>
          <button
            onClick={onSignOut}
            style={{
              background: "none",
              border: "none",
              color: C.muted,
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: F.body,
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={() => setShowConfig(true)}
          title="Points Config (Admin)"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: C.green,
            color: C.white,
            border: "none",
            borderRadius: "50%",
            width: 52,
            height: 52,
            fontSize: 20,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ⚙
        </button>
      )}
      {showConfig && (
        <AdminConfigModal
          config={config}
          onSave={(newConfig) => setConfig(newConfig)}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — handles session / auth gating
// ═══════════════════════════════════════════════════════════════════════════════
export default function Account() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForceLogout, setShowForceLogout] = useState(false);
  const redirectedRef = useRef(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loggedInProfile, setLoggedInProfile] = useState(null);
  const [loggedInRole, setLoggedInRole] = useState(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("return");
  const { setRole } = useContext(RoleContext);

  const doRedirect = (profile) => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    if (profile?.role) setRole(profile.role);
    const roleRoute = {
      admin: "/admin",
      retailer: "/wholesale",
      customer: "/loyalty",
    };
    const roleDefaults = ["/wholesale", "/admin", "/loyalty"];
    const useReturnUrl = returnUrl && !roleDefaults.includes(returnUrl);
    navigate(
      useReturnUrl ? returnUrl : roleRoute[profile?.role] || "/loyalty",
      { replace: true },
    );
  };

  const handlePostAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const profile = await ensureProfile(user.id);
        doRedirect(profile);
      } else {
        setError("Sign-in succeeded but no session was created.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong after sign-in.");
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const forceTimer = setTimeout(() => {
      if (mounted && checkingSession) setShowForceLogout(true);
    }, 3000);
    const timeoutTimer = setTimeout(() => {
      if (mounted && checkingSession) setCheckingSession(false);
    }, 5000);
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && mounted) {
          const profile = await ensureProfile(user.id);
          if (profile?.role) setRole(profile.role);
          const roleDefaults = ["/wholesale", "/admin"];
          const shouldRedirect = returnUrl && !roleDefaults.includes(returnUrl);
          if (shouldRedirect) {
            doRedirect(profile);
          } else {
            redirectedRef.current = true;
            setLoggedInUser(user);
            setLoggedInProfile(profile);
            setLoggedInRole(profile?.role || "customer");
          }
        }
      } catch (e) {
        console.error("Session check error:", e);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    })();
    return () => {
      mounted = false;
      clearTimeout(forceTimer);
      clearTimeout(timeoutTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    await handlePostAuth();
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
    });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    if (data?.user && !data.session) {
      setMessage("Check your email for a confirmation link, then sign in.");
      setLoading(false);
    }
  };

  const handleDevLogin = async (devEmail, devPw) => {
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPw,
    });
    if (err) {
      setError(`Dev login failed: ${err.message}.`);
      setLoading(false);
      return;
    }
    await handlePostAuth();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("protea_role");
    setRole(null);
    redirectedRef.current = false;
    setLoggedInUser(null);
    setLoggedInProfile(null);
    setLoggedInRole(null);
    navigate("/", { replace: true });
  };

  const handleForceSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    setRole(null);
    redirectedRef.current = false;
    setCheckingSession(false);
    setShowForceLogout(false);
    setLoggedInUser(null);
    setLoggedInProfile(null);
    setLoggedInRole(null);
  };

  const isDev = process.env.NODE_ENV === "development";

  if (checkingSession)
    return (
      <>
        <ClientHeader variant="light" />
        <div
          style={{
            minHeight: "100vh",
            background: "#faf9f6",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: F.body,
          }}
        >
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid #e0dbd2",
              borderTopColor: "#1b4332",
              borderRadius: "50%",
              animation: "spin .8s linear infinite",
            }}
          />
          <p style={{ color: "#888", marginTop: 16, fontSize: 13 }}>
            Checking session…
          </p>
          {showForceLogout && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
                Taking too long?
              </p>
              <button
                onClick={handleForceSignOut}
                style={{
                  background: "#c0392b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 2,
                  padding: "10px 24px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontFamily: F.body,
                  cursor: "pointer",
                }}
              >
                Force Sign Out &amp; Reset
              </button>
            </div>
          )}
        </div>
      </>
    );

  if (loggedInUser)
    return (
      <>
        <ClientHeader variant="light" />
        <AccountView
          user={loggedInUser}
          profile={loggedInProfile}
          role={loggedInRole}
          onSignOut={handleSignOut}
          onProfileUpdate={(updated) => setLoggedInProfile(updated)}
        />
      </>
    );

  return (
    <>
      <ClientHeader variant="light" />
      <div
        style={{
          minHeight: "100vh",
          background: "#faf9f6",
          fontFamily: F.body,
          padding: "40px 20px",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');`}</style>
        {returnUrl && (
          <div
            style={{
              background: "#e8f5e9",
              border: "1px solid #52b788",
              borderRadius: 8,
              padding: "14px 20px",
              marginBottom: 24,
              fontSize: 14,
              color: "#1b4332",
            }}
          >
            🔑 Sign in to claim your points — you'll be taken straight back.
          </div>
        )}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".35em",
              textTransform: "uppercase",
              color: "#52b788",
              marginBottom: 8,
            }}
          >
            Protea Botanicals
          </div>
          <h1
            style={{
              fontFamily: F.heading,
              fontSize: 32,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: 0,
            }}
          >
            Sign In
          </h1>
        </div>
        {error && (
          <div
            style={{
              background: "#fce4ec",
              border: "1px solid #e0dbd2",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 14,
              color: "#c0392b",
            }}
          >
            {error}
          </div>
        )}
        {message && (
          <div
            style={{
              background: "#e8f5e9",
              border: "1px solid #52b788",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
              fontSize: 14,
              color: "#1b4332",
            }}
          >
            {message}
          </div>
        )}
        <form onSubmit={handleSignIn}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "#888",
                display: "block",
                marginBottom: 6,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e0dbd2",
                borderRadius: 4,
                fontSize: 15,
                fontFamily: F.body,
                background: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "#888",
                display: "block",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #e0dbd2",
                borderRadius: 4,
                fontSize: 15,
                fontFamily: F.body,
                background: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#888" : "#1b4332",
              color: "#fff",
              border: "none",
              borderRadius: 2,
              padding: 14,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              cursor: loading ? "wait" : "pointer",
              fontFamily: F.body,
              marginBottom: 12,
            }}
          >
            {loading ? "Signing In…" : "Sign In"}
          </button>
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            style={{
              width: "100%",
              background: "transparent",
              color: "#1b4332",
              border: "1.5px solid #1b4332",
              borderRadius: 2,
              padding: 14,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              cursor: loading ? "wait" : "pointer",
              fontFamily: F.body,
            }}
          >
            Create Account
          </button>
        </form>
        {isDev && (
          <div
            style={{
              marginTop: 40,
              border: "2px solid #e67e22",
              borderRadius: 8,
              padding: 20,
              background: "#fff3e0",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "#e67e22",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              ⚠ Dev Test Logins
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  handleDevLogin("customer@protea.dev", "customer123")
                }
                style={{
                  padding: "10px 16px",
                  background: "#1b4332",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: F.body,
                }}
              >
                🛒 Customer → /loyalty
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDevLogin("admin@protea.dev", "admin123")}
                style={{
                  padding: "10px 16px",
                  background: "#2c4a6e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: F.body,
                }}
              >
                🔧 Admin → /admin
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  handleDevLogin("wholesale@protea.dev", "wholesale123")
                }
                style={{
                  padding: "10px 16px",
                  background: "#5c3d1e",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: F.body,
                }}
              >
                🏪 Retailer → /wholesale
              </button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: F.body,
            }}
          >
            Sign out of current session
          </button>
        </div>
      </div>
    </>
  );
}
