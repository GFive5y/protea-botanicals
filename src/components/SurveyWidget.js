// src/components/SurveyWidget.js — v1.0
// Embedded in ScanResult.js.
// Fires ONLY on the user's 5th successful scan (totalScans === 5).
// 3 questions → +25 pts → stores to survey_responses.
// One-time only: checks survey_responses on mount, never shows again after completion.

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabaseClient";

const GREEN = "#2D5016";
const LIGHT_GRN = "#EDF4E5";

const Q1_OPTIONS = ["Recreational", "Medical", "Both"];
const Q2_OPTIONS = ["QR code", "Friend", "Social media", "In store"];

export default function SurveyWidget({ userId, totalScans, onComplete, tenantId }) {
  // status: 'checking' | 'hidden' | 'visible' | 'done'
  const [status, setStatus] = useState("checking");
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    q1_use_case: "",
    q2_discovery: "",
    q3_favourite_strain: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const checkEligibility = useCallback(async () => {
    if (!userId || totalScans !== 5) {
      setStatus("hidden");
      return;
    }
    const { data } = await supabase
      .from("survey_responses")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    setStatus(data ? "hidden" : "visible");
  }, [userId, totalScans]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const { error: surveyErr } = await supabase
        .from("survey_responses")
        .insert({
          user_id: userId,
          scan_number: totalScans,
          q1_use_case: answers.q1_use_case,
          q2_discovery: answers.q2_discovery,
          q3_favourite_strain: answers.q3_favourite_strain,
          points_awarded: 25,
        });
      if (surveyErr) throw surveyErr;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("loyalty_points")
        .eq("id", userId)
        .maybeSingle();
      const newBalance = (profile?.loyalty_points || 0) + 25;

      // UPDATE only — never upsert
      await supabase
        .from("user_profiles")
        .update({ loyalty_points: newBalance })
        .eq("id", userId);

      await supabase.from("loyalty_transactions").insert({
        user_id: userId,
        tenant_id: tenantId || null,
        transaction_type: "EARNED",
        points: 25,
        balance_after: newBalance,
        channel: "survey",
      });

      setStatus("done");
      if (onComplete) onComplete(25);
    } catch (err) {
      console.error("SurveyWidget submit error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "checking" || status === "hidden") return null;

  const s = {
    wrap: {
      margin: "24px 0",
      background: LIGHT_GRN,
      border: `2px solid ${GREEN}`,
      borderRadius: 16,
      padding: "24px 20px",
      fontFamily: "'Jost', sans-serif",
    },
    heading: {
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 22,
      color: GREEN,
      margin: "0 0 4px",
      fontWeight: 600,
    },
    sub: { color: "#666", fontSize: 14, margin: "0 0 20px" },
    q: { fontSize: 16, color: "#222", fontWeight: 600, marginBottom: 14 },
    opts: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 },
    opt: (sel) => ({
      padding: "10px 20px",
      borderRadius: 24,
      cursor: "pointer",
      fontSize: 14,
      border: `2px solid ${sel ? GREEN : "#ccc"}`,
      background: sel ? GREEN : "#fff",
      color: sel ? "#fff" : "#333",
      fontWeight: sel ? 600 : 400,
      fontFamily: "'Jost', sans-serif",
      transition: "all 0.18s",
    }),
    input: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: 10,
      boxSizing: "border-box",
      border: "2px solid #ccc",
      fontSize: 15,
      fontFamily: "'Jost', sans-serif",
      outline: "none",
      marginBottom: 16,
    },
    row: { display: "flex", gap: 10, flexWrap: "wrap" },
    btn: (disabled, secondary) => ({
      padding: "11px 26px",
      borderRadius: 24,
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: 14,
      fontWeight: 600,
      fontFamily: "'Jost', sans-serif",
      background: disabled ? "#ccc" : secondary ? "#888" : GREEN,
      color: "#fff",
      opacity: disabled ? 0.6 : 1,
      transition: "opacity 0.15s",
    }),
    progress: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 20,
    },
    dot: (active, done) => ({
      width: 26,
      height: 26,
      borderRadius: "50%",
      fontSize: 12,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: done || active ? GREEN : "#ddd",
      color: done || active ? "#fff" : "#aaa",
    }),
    error: { color: "#c0392b", fontSize: 13, marginTop: 8 },
  };

  if (status === "done") {
    return (
      <div style={s.wrap}>
        <h3 style={s.heading}>🎉 Thanks for your feedback!</h3>
        <p style={s.sub}>
          +25 bonus points have been added to your account. 🌿
        </p>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <h3 style={s.heading}>🎯 5th Scan Milestone — Quick Survey</h3>
      <p style={s.sub}>
        3 quick questions. Earn +25 bonus points for answering.
      </p>

      {/* Progress indicator */}
      <div style={s.progress}>
        {[1, 2, 3].map((n) => (
          <div key={n} style={s.dot(step === n, step > n)}>
            {step > n ? "✓" : n}
          </div>
        ))}
        <span style={{ color: "#888", fontSize: 13, marginLeft: 4 }}>
          Question {step} of 3
        </span>
      </div>

      {/* Q1 */}
      {step === 1 && (
        <>
          <p style={s.q}>What do you use Protea Botanicals products for?</p>
          <div style={s.opts}>
            {Q1_OPTIONS.map((opt) => (
              <button
                key={opt}
                style={s.opt(answers.q1_use_case === opt)}
                onClick={() => setAnswers((a) => ({ ...a, q1_use_case: opt }))}
              >
                {opt}
              </button>
            ))}
          </div>
          <div style={s.row}>
            <button
              style={s.btn(!answers.q1_use_case, false)}
              disabled={!answers.q1_use_case}
              onClick={() => setStep(2)}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {/* Q2 */}
      {step === 2 && (
        <>
          <p style={s.q}>How did you first find out about us?</p>
          <div style={s.opts}>
            {Q2_OPTIONS.map((opt) => (
              <button
                key={opt}
                style={s.opt(answers.q2_discovery === opt)}
                onClick={() => setAnswers((a) => ({ ...a, q2_discovery: opt }))}
              >
                {opt}
              </button>
            ))}
          </div>
          <div style={s.row}>
            <button style={s.btn(false, true)} onClick={() => setStep(1)}>
              ← Back
            </button>
            <button
              style={s.btn(!answers.q2_discovery, false)}
              disabled={!answers.q2_discovery}
              onClick={() => setStep(3)}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {/* Q3 */}
      {step === 3 && (
        <>
          <p style={s.q}>What's your favourite strain or product?</p>
          <input
            type="text"
            placeholder="e.g. Blue Dream, MAC Cart, Durban Poison…"
            value={answers.q3_favourite_strain}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, q3_favourite_strain: e.target.value }))
            }
            style={s.input}
          />
          {error && <p style={s.error}>{error}</p>}
          <div style={s.row}>
            <button style={s.btn(false, true)} onClick={() => setStep(2)}>
              ← Back
            </button>
            <button
              style={s.btn(
                submitting || !answers.q3_favourite_strain.trim(),
                false,
              )}
              disabled={submitting || !answers.q3_favourite_strain.trim()}
              onClick={handleSubmit}
            >
              {submitting ? "Saving…" : "Submit & Earn 25 pts 🎁"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
