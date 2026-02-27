// src/pages/Account.js — Protea Botanicals v5.1
// Production-ready auth: real signInWithPassword, auto-create user_profiles,
// onAuthStateChange for reliable redirects, dev panel hidden in production.

import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { RoleContext } from "../App";

// Ensure a user_profiles row exists (shared with Loyalty.js logic)
async function ensureProfile(userId, email) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, role, loyalty_points")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    const { data: created, error: insertErr } = await supabase
      .from("user_profiles")
      .insert({ id: userId, role: "customer", loyalty_points: 0 })
      .select("id, role, loyalty_points")
      .single();
    if (insertErr) console.error("ensureProfile insert failed:", insertErr);
    return created;
  }
  return data;
}

export default function Account() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const redirectedRef = useRef(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("return");
  const { setRole } = useContext(RoleContext);

  // Helper: redirect after successful auth
  const doRedirect = (profile) => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    if (profile?.role) setRole(profile.role);
    const dest = returnUrl || "/loyalty";
    navigate(dest, { replace: true });
  };

  // 1. Check existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const profile = await ensureProfile(user.id, user.email);
          doRedirect(profile);
        }
      } catch (e) {
        console.error("Session check:", e);
      } finally {
        setCheckingSession(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Global onAuthStateChange — catches sign-in events from any method
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const profile = await ensureProfile(
          session.user.id,
          session.user.email,
        );
        doRedirect(profile);
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── SIGN IN ───
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
      }
      // onAuthStateChange handles redirect
    } catch (err) {
      setError("Unexpected error. Please try again.");
      setLoading(false);
    }
  };

  // ─── SIGN UP ───
  const handleSignUp = async () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      // If auto-confirmed, onAuthStateChange will redirect
      // If email confirmation required, show message
      if (data?.user && !data.session) {
        setMessage("Check your email for a confirmation link, then sign in.");
        setLoading(false);
      }
    } catch (err) {
      setError("Unexpected error. Please try again.");
      setLoading(false);
    }
  };

  // ─── DEV LOGIN (real Supabase auth) ───
  const handleDevLogin = async (devEmail, devPw) => {
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPw,
      });
      if (err) {
        setError(
          `Dev login failed: ${err.message}. Ensure account exists in Supabase Auth.`,
        );
        setLoading(false);
      }
      // onAuthStateChange handles redirect
    } catch (err) {
      setError("Dev login failed unexpectedly.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    redirectedRef.current = false;
    navigate("/", { replace: true });
  };

  const isDev = process.env.NODE_ENV === "development";

  // Show nothing while checking existing session
  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#faf9f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
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
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');`}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#faf9f6",
          fontFamily: "'Jost',sans-serif",
          padding: "40px 20px",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {/* Return-URL banner */}
        {returnUrl && (
          <div
            style={{
              background: "#e8f5e9",
              border: "1px solid #52b788",
              borderRadius: 8,
              padding: "14px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>🔑</span>
            <span style={{ color: "#1b4332", fontWeight: 500, fontSize: 14 }}>
              Sign in to claim your points — you'll be taken straight back.
            </span>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
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
              fontFamily: "'Cormorant Garamond',Georgia,serif",
              fontSize: 32,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: 0,
            }}
          >
            Sign In
          </h1>
        </div>

        {/* Messages */}
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

        {/* Form */}
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
                fontFamily: "'Jost',sans-serif",
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
                fontFamily: "'Jost',sans-serif",
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
              fontFamily: "'Jost',sans-serif",
              marginBottom: 12,
            }}
          >
            {loading ? "Signing In..." : "Sign In"}
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
              fontFamily: "'Jost',sans-serif",
            }}
          >
            Create Account
          </button>
        </form>

        {/* ─── DEV TEST PANEL (development only) ─── */}
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
            <p
              style={{
                fontSize: 12,
                color: "#888",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Real Supabase auth. Accounts must exist in Auth dashboard.
            </p>

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
                  fontFamily: "'Jost',sans-serif",
                }}
              >
                🛒 Customer → /loyalty
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  handleDevLogin("wholesale@protea.dev", "wholesale123")
                }
                style={{
                  padding: "10px 16px",
                  background: "#7c3a10",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Jost',sans-serif",
                }}
              >
                📦 Wholesaler → /wholesale
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
                  fontFamily: "'Jost',sans-serif",
                }}
              >
                🔧 Admin → /admin
              </button>
            </div>

            <p
              style={{
                fontSize: 11,
                color: "#888",
                marginTop: 12,
                textAlign: "center",
              }}
            >
              Passwords: customer123 / wholesale123 / admin123
              {returnUrl && (
                <>
                  <br />
                  <span style={{ color: "#e67e22" }}>
                    Return URL: {returnUrl}
                  </span>
                </>
              )}
            </p>
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
              fontFamily: "'Jost',sans-serif",
            }}
          >
            Sign out of current session
          </button>
        </div>
      </div>
    </>
  );
}
