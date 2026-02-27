// src/pages/Login.js - FINAL ROBUST VERSION (Claude AI v3.5)
import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [usePhone, setUsePhone] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auto-redirect when session is ready (SOW compliant)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          navigate("/loyalty", { replace: true });
        }
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usePhone && !showOtp) {
      if (cooldown > 0) return;
      setLoading(true);
      setError("");
      try {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
        setShowOtp(true);
        setCooldown(10);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError("");
    try {
      let normalizedPhone = phone;
      if (normalizedPhone.startsWith("00"))
        normalizedPhone = "+" + normalizedPhone.slice(2);
      if (!normalizedPhone.startsWith("+"))
        normalizedPhone = "+" + normalizedPhone;

      const { error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp,
        type: "sms",
      });

      if (error) throw error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "60px auto",
        padding: "30px",
        background: "#282c34",
        borderRadius: "12px",
        color: "#fff",
      }}
    >
      <h1 style={{ textAlign: "center" }}>Log In</h1>
      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {!usePhone && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                margin: "15px 0",
                padding: "12px",
                fontSize: "16px",
              }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                margin: "15px 0",
                padding: "12px",
                fontSize: "16px",
              }}
              required
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: "#61dafb",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                marginTop: "10px",
                fontSize: "16px",
              }}
            >
              Log In with Email
            </button>
          </>
        )}

        {usePhone && !showOtp && (
          <>
            <input
              type="tel"
              placeholder="+27773943654"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                margin: "15px 0",
                padding: "12px",
                fontSize: "16px",
              }}
              required
            />
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              style={{
                width: "100%",
                padding: "14px",
                background: cooldown > 0 ? "#555" : "#61dafb",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                marginTop: "10px",
                fontSize: "16px",
              }}
            >
              {cooldown > 0 ? `Wait ${cooldown}s...` : "Send OTP"}
            </button>
          </>
        )}

        {showOtp && (
          <>
            <input
              type="text"
              placeholder="Enter OTP (123456)"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={{
                display: "block",
                width: "100%",
                margin: "15px 0",
                padding: "12px",
                fontSize: "16px",
              }}
              required
            />
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: "#61dafb",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                marginTop: "10px",
                fontSize: "16px",
              }}
            >
              Verify OTP
            </button>
          </>
        )}
      </form>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <label style={{ color: "#61dafb", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={usePhone}
            onChange={(e) => {
              setUsePhone(e.target.checked);
              setShowOtp(false);
            }}
          />{" "}
          Use Phone OTP instead
        </label>
      </div>
    </div>
  );
}
