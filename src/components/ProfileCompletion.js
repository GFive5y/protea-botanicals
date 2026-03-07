// src/components/ProfileCompletion.js v1.0
// Phase 2: Progressive profiling component.
// Shows inline in Account.js and as a post-scan nudge.
// Awards 50 bonus points on completion via DB function.
// Fields: DOB, province, preferred_type, how_heard, marketing_opt_in, POPIA consent.

import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { checkProfileCompleteness } from "../services/geoService";

const T = {
  green: "#1b4332",
  light: "#52b788",
  gold: "#b5935a",
  bg: "#faf9f6",
  surface: "#ffffff",
  border: "#e8e0d4",
  text: "#1a1a1a",
  muted: "#888",
  faint: "#f4f0ea",
  font: "'Jost', sans-serif",
  serif: "'Cormorant Garamond', Georgia, serif",
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

const HOW_HEARD = [
  { value: "dispensary_scan", label: "Scanned at a dispensary" },
  { value: "friend_referral", label: "Friend recommendation" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google search" },
  { value: "other", label: "Other" },
];

const STRAIN_PREFS = [
  { value: "sativa", label: "Sativa", desc: "Uplifting & energising" },
  { value: "indica", label: "Indica", desc: "Relaxing & calming" },
  { value: "hybrid", label: "Hybrid", desc: "Balanced effects" },
  { value: "none", label: "No preference", desc: "Open to anything" },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Jost:wght@300;400;500;600&display=swap');
  .pc-input {
    width: 100%; padding: 10px 12px; border: 1px solid #e8e0d4; border-radius: 2px;
    font-family: 'Jost', sans-serif; font-size: 13px; color: #1a1a1a; background: #faf9f6;
    outline: none; transition: border-color 0.2s; box-sizing: border-box;
  }
  .pc-input:focus { border-color: #1b4332; background: white; }
  .pc-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; cursor: pointer; }
  .pc-chip { border: 1px solid #e8e0d4; border-radius: 2px; padding: 8px 14px; cursor: pointer; transition: all 0.2s; text-align: center; }
  .pc-chip:hover { border-color: #1b4332; }
  .pc-chip-active { background: #1b4332; border-color: #1b4332; }
  .pc-chip-active .pc-chip-label { color: white; }
  .pc-chip-active .pc-chip-desc { color: rgba(255,255,255,0.6); }
  .pc-checkbox { width: 16px; height: 16px; border: 1.5px solid #d0c9be; border-radius: 2px; cursor: pointer; appearance: none; transition: all 0.2s; flex-shrink: 0; }
  .pc-checkbox:checked { background: #1b4332; border-color: #1b4332; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='8' viewBox='0 0 10 8'%3E%3Cpath d='M1 4l3 3 5-6' stroke='white' stroke-width='1.5' fill='none'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: center; }
  .pc-btn { font-family: 'Jost',sans-serif; padding: 12px 28px; border: none; border-radius: 2px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-weight: 500; }
  .pc-btn-green { background: #1b4332; color: white; }
  .pc-btn-green:hover { background: #2d6a4f; }
  .pc-btn-green:disabled { opacity: 0.5; cursor: not-allowed; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .pc-animate { animation: fadeIn 0.3s ease forwards; }
`;

export default function ProfileCompletion({
  userId,
  onComplete,
  compact = false,
}) {
  const [profile, setProfile] = useState(null);
  const [completeness, setCompleteness] = useState(null);
  const [step, setStep] = useState(0); // 0=overview, 1=fields, 2=done
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    date_of_birth: "",
    province: "",
    preferred_type: "",
    how_heard: "",
    marketing_opt_in: false,
    analytics_opt_in: false,
    popia_consented: false,
  });

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  async function fetchProfile() {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data);
      setCompleteness(checkProfileCompleteness(data));
      // Pre-fill existing values
      setForm((prev) => ({
        ...prev,
        date_of_birth: data.date_of_birth || "",
        province: data.province || "",
        preferred_type: data.preferred_type || "",
        how_heard: data.how_heard || "",
        marketing_opt_in: data.marketing_opt_in || false,
        analytics_opt_in: data.analytics_opt_in || false,
        popia_consented: data.popia_consented || false,
      }));
    }
  }

  async function handleSave() {
    if (!form.popia_consented) {
      setError("Please accept the privacy policy to continue.");
      return;
    }
    setSaving(true);
    setError("");

    // Check profile completeness BEFORE save
    const updatedProfile = { ...profile, ...form };
    const newCompleteness = checkProfileCompleteness(updatedProfile);

    const updates = {
      ...form,
      popia_date: form.popia_consented ? new Date().toISOString() : null,
      profile_complete: newCompleteness.isComplete,
      last_active_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", userId);

    if (saveError) {
      setError("Could not save changes. Please try again.");
      setSaving(false);
      return;
    }

    // Award completion points if newly complete
    if (newCompleteness.isComplete && !profile?.profile_points_awarded) {
      await supabase.rpc("award_profile_completion_points", {
        p_user_id: userId,
      });
    }

    setSaved(true);
    setSaving(false);
    setStep(2);
    if (onComplete) onComplete(newCompleteness);
  }

  // ── Already complete ─────────────────────────────────────────────────────
  if (completeness?.isComplete && step !== 2) {
    return (
      <div>
        <style>{styles}</style>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            background: "rgba(82,183,136,0.08)",
            border: "1px solid rgba(82,183,136,0.25)",
            borderRadius: 2,
          }}
        >
          <span style={{ fontSize: 20 }}>✓</span>
          <div>
            <p
              style={{
                fontFamily: T.font,
                fontSize: 13,
                color: "#1a1a1a",
                fontWeight: 500,
              }}
            >
              Profile complete
            </p>
            <p
              style={{
                fontFamily: T.font,
                fontSize: 11,
                color: T.muted,
                fontWeight: 300,
              }}
            >
              All fields filled · 50 bonus points awarded
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Done ─────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div>
        <style>{styles}</style>
        <div
          className="pc-animate"
          style={{
            padding: compact ? "20px" : "32px",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
          <p
            style={{
              fontFamily: T.serif,
              fontSize: 28,
              fontWeight: 300,
              color: T.green,
              marginBottom: 8,
            }}
          >
            Profile Complete
          </p>
          <p
            style={{
              fontFamily: T.font,
              fontSize: 13,
              color: T.muted,
              fontWeight: 300,
              marginBottom: 20,
              lineHeight: 1.7,
            }}
          >
            50 bonus points have been added to your account. You'll now receive
            personalised strain recommendations based on your preferences.
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: "rgba(181,147,90,0.1)",
              borderRadius: 2,
            }}
          >
            <span
              style={{
                fontFamily: T.font,
                fontSize: 11,
                color: T.gold,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              +50 Points Added
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 0: Overview / teaser ────────────────────────────────────────────
  if (step === 0 && !compact) {
    return (
      <div>
        <style>{styles}</style>
        <div
          style={{
            padding: "28px",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: T.font,
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: T.gold,
                  marginBottom: 8,
                }}
              >
                Earn 50 Points
              </p>
              <p
                style={{
                  fontFamily: T.serif,
                  fontSize: 26,
                  fontWeight: 300,
                  color: T.text,
                  marginBottom: 6,
                }}
              >
                Complete Your Profile
              </p>
              <p
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  color: T.muted,
                  fontWeight: 300,
                  lineHeight: 1.65,
                }}
              >
                Unlock personalised strain recommendations and earn 50 bonus
                points by completing a few quick details.
              </p>
            </div>
            <div
              style={{
                textAlign: "center",
                background: T.faint,
                padding: "16px 24px",
                borderRadius: 2,
                minWidth: 100,
              }}
            >
              <p
                style={{
                  fontFamily: T.serif,
                  fontSize: 36,
                  fontWeight: 300,
                  color: T.green,
                  lineHeight: 1,
                }}
              >
                {completeness?.percent || 0}%
              </p>
              <p
                style={{
                  fontFamily: T.font,
                  fontSize: 9,
                  color: T.muted,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginTop: 4,
                }}
              >
                Complete
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 3,
              background: T.faint,
              borderRadius: 2,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${completeness?.percent || 0}%`,
                background: T.green,
                borderRadius: 2,
                transition: "width 0.5s",
              }}
            />
          </div>

          {/* Missing fields */}
          {completeness?.missing?.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 20,
              }}
            >
              {completeness.missing.map((f) => (
                <span
                  key={f.key}
                  style={{
                    fontFamily: T.font,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    padding: "3px 8px",
                    background: T.faint,
                    borderRadius: 2,
                    color: T.muted,
                  }}
                >
                  {f.label}
                </span>
              ))}
            </div>
          )}

          <button className="pc-btn pc-btn-green" onClick={() => setStep(1)}>
            Complete Profile
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Form ─────────────────────────────────────────────────────────
  return (
    <div>
      <style>{styles}</style>
      <div
        style={{
          padding: compact ? "20px" : "28px",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 2,
        }}
      >
        {!compact && (
          <div style={{ marginBottom: 24 }}>
            <p
              style={{
                fontFamily: T.font,
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: T.gold,
                marginBottom: 6,
              }}
            >
              Profile Details
            </p>
            <p
              style={{
                fontFamily: T.serif,
                fontSize: 24,
                fontWeight: 300,
                color: T.text,
              }}
            >
              A few quick questions
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Date of birth */}
          <div>
            <label
              style={{
                fontFamily: T.font,
                fontSize: 10,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: T.muted,
                display: "block",
                marginBottom: 6,
              }}
            >
              Date of Birth{" "}
              <span style={{ color: T.gold }}>· Birthday rewards</span>
            </label>
            <input
              type="date"
              className="pc-input"
              value={form.date_of_birth}
              max={
                new Date(Date.now() - 18 * 365.25 * 86400000)
                  .toISOString()
                  .split("T")[0]
              }
              onChange={(e) =>
                setForm({ ...form, date_of_birth: e.target.value })
              }
            />
            <p
              style={{
                fontFamily: T.font,
                fontSize: 10,
                color: T.muted,
                fontWeight: 300,
                marginTop: 4,
              }}
            >
              Used for age verification and birthday bonus rewards. Never
              shared.
            </p>
          </div>

          {/* Province */}
          <div>
            <label
              style={{
                fontFamily: T.font,
                fontSize: 10,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: T.muted,
                display: "block",
                marginBottom: 6,
              }}
            >
              Province
            </label>
            <select
              className="pc-input pc-select"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            >
              <option value="">Select province…</option>
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* How heard */}
          <div>
            <label
              style={{
                fontFamily: T.font,
                fontSize: 10,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: T.muted,
                display: "block",
                marginBottom: 6,
              }}
            >
              How did you hear about us?
            </label>
            <select
              className="pc-input pc-select"
              value={form.how_heard}
              onChange={(e) => setForm({ ...form, how_heard: e.target.value })}
            >
              <option value="">Select…</option>
              {HOW_HEARD.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>

          {/* Strain preference */}
          <div>
            <label
              style={{
                fontFamily: T.font,
                fontSize: 10,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: T.muted,
                display: "block",
                marginBottom: 10,
              }}
            >
              Preferred Strain Type{" "}
              <span style={{ color: T.gold }}>
                · Personalised recommendations
              </span>
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              {STRAIN_PREFS.map((s) => (
                <div
                  key={s.value}
                  className={`pc-chip ${form.preferred_type === s.value ? "pc-chip-active" : ""}`}
                  onClick={() => setForm({ ...form, preferred_type: s.value })}
                >
                  <p
                    className="pc-chip-label"
                    style={{
                      fontFamily: T.font,
                      fontSize: 12,
                      fontWeight: 500,
                      color: form.preferred_type === s.value ? "white" : T.text,
                      marginBottom: 2,
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    className="pc-chip-desc"
                    style={{
                      fontFamily: T.font,
                      fontSize: 10,
                      color:
                        form.preferred_type === s.value
                          ? "rgba(255,255,255,0.6)"
                          : T.muted,
                      fontWeight: 300,
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Consent */}
          <div
            style={{
              padding: "16px",
              background: T.faint,
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <p
              style={{
                fontFamily: T.font,
                fontSize: 10,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: T.muted,
                marginBottom: 0,
              }}
            >
              Communication & Consent
            </p>

            {[
              {
                key: "marketing_opt_in",
                label:
                  "Receive product updates, new strain alerts, and exclusive offers by email",
                required: false,
              },
              {
                key: "analytics_opt_in",
                label:
                  "Allow scan behaviour analytics to personalise your recommendations",
                required: false,
              },
              {
                key: "popia_consented",
                label:
                  "I have read and agree to the Privacy Policy. I consent to Protea Botanicals processing my personal information as described.",
                required: true,
              },
            ].map((item) => (
              <label
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  className="pc-checkbox"
                  style={{ marginTop: 2 }}
                  checked={form[item.key]}
                  onChange={(e) =>
                    setForm({ ...form, [item.key]: e.target.checked })
                  }
                />
                <span
                  style={{
                    fontFamily: T.font,
                    fontSize: 12,
                    color: T.text,
                    fontWeight: 300,
                    lineHeight: 1.6,
                  }}
                >
                  {item.required && (
                    <strong style={{ fontWeight: 500 }}>Required · </strong>
                  )}
                  {item.label}
                </span>
              </label>
            ))}

            <p
              style={{
                fontFamily: T.font,
                fontSize: 10,
                color: T.muted,
                fontWeight: 300,
                lineHeight: 1.6,
                marginTop: 4,
              }}
            >
              Protected under POPIA (Protection of Personal Information Act).
              Your data is never sold to third parties. You may withdraw consent
              or request deletion at any time via your account settings.
            </p>
          </div>

          {error && (
            <p
              style={{
                fontFamily: T.font,
                fontSize: 12,
                color: "#dc2626",
                fontWeight: 400,
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="pc-btn pc-btn-green"
              onClick={handleSave}
              disabled={saving || !form.popia_consented}
            >
              {saving ? "Saving…" : "Save & Earn 50 Points"}
            </button>
            {step === 1 && !compact && (
              <button
                className="pc-btn"
                style={{
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  color: T.muted,
                  fontFamily: T.font,
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  borderRadius: 2,
                  padding: "12px 24px",
                }}
                onClick={() => setStep(0)}
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
