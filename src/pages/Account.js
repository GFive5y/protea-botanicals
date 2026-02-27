// src/pages/Account.js — Protea Botanicals v5.5
// ============================================================================
// CHANGELOG v5.4 → v5.5:
//   1. FIX: doRedirect now uses role-based routing when no ?return= URL.
//      Previously hardcoded "/loyalty" for all roles. Now: admin→/admin,
//      retailer→/wholesale, customer→/loyalty.
//   2. Smart returnUrl: ignores ?return= when it points to a role homepage
//      (/loyalty, /wholesale, /admin) — uses role-based route instead.
//      Still honors ?return= for specific paths like /scan/:qrCode or /redeem.
//   ONE FUNCTION CHANGE (doRedirect) — all other v5.4 features preserved.
//
// CHANGELOG v5.3 → v5.4:
//   1. handleSignOut now clears protea_role from localStorage on logout.
//      This prevents stale role data persisting after sign-out, which
//      caused partial-session confusion on next visit.
//   ONE LINE CHANGE — all v5.3 features preserved exactly.
//
// CHANGELOG v5.2 → v5.3:
//   1. CRITICAL FIX: handleSignIn and handleDevLogin now handle redirect
//      DIRECTLY after successful signInWithPassword() instead of relying
//      solely on onAuthStateChange. This fixes the "SIGNING IN..." hang
//      caused by Supabase emitting TOKEN_REFRESHED or INITIAL_SESSION
//      instead of SIGNED_IN when a stale session exists.
//   2. onAuthStateChange kept as BACKUP (catches edge cases like OAuth).
//   3. Added console.log breadcrumbs for easier future debugging.
// ============================================================================

import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { RoleContext } from "../App";

// Ensure a user_profiles row exists (shared with Loyalty.js logic)
async function ensureProfile(userId, email) {
  console.log("ensureProfile: checking for", userId);
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, role, loyalty_points")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    console.log("ensureProfile: no profile found, creating one");
    const { data: created, error: insertErr } = await supabase
      .from("user_profiles")
      .insert({ id: userId, role: "customer", loyalty_points: 0 })
      .select("id, role, loyalty_points")
      .single();
    if (insertErr) console.error("ensureProfile insert failed:", insertErr);
    return created;
  }
  if (error) {
    console.error("ensureProfile query error:", error);
  }
  console.log("ensureProfile: got profile", data);
  return data;
}

export default function Account() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForceLogout, setShowForceLogout] = useState(false); // v5.2
  const redirectedRef = useRef(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("return");
  const { setRole } = useContext(RoleContext);

  // Helper: redirect after successful auth — v5.5: role-based routing
  const doRedirect = (profile) => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    console.log("doRedirect: navigating with profile", profile);
    if (profile?.role) setRole(profile.role);
    // v5.5: Route by role when no ?return= URL present
    const roleRoute = {
      admin: "/admin",
      retailer: "/wholesale",
      customer: "/loyalty",
    };
    // v5.5: Ignore returnUrl when it points to a role homepage — use role route instead.
    // Still honors returnUrl for specific paths like /scan/PB-001-2026-0001 or /redeem.
    const roleDefaults = ["/loyalty", "/wholesale", "/admin"];
    const useReturnUrl = returnUrl && !roleDefaults.includes(returnUrl);
    const dest = useReturnUrl
      ? returnUrl
      : roleRoute[profile?.role] || "/loyalty";
    console.log(
      "doRedirect: returnUrl =",
      returnUrl,
      "| useReturnUrl =",
      useReturnUrl,
      "| destination =",
      dest,
    );
    navigate(dest, { replace: true });
  };

  // v5.3: Shared post-auth handler — called directly after successful sign-in
  const handlePostAuth = async () => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) {
        console.error("handlePostAuth: getUser failed", userErr);
        setError(
          "Sign-in succeeded but session could not be verified. Please try again.",
        );
        setLoading(false);
        return;
      }
      if (user) {
        console.log("handlePostAuth: user confirmed", user.email);
        const profile = await ensureProfile(user.id, user.email);
        doRedirect(profile);
      } else {
        console.warn("handlePostAuth: no user after successful auth");
        setError(
          "Sign-in succeeded but no session was created. Please try again.",
        );
        setLoading(false);
      }
    } catch (e) {
      console.error("handlePostAuth: unexpected error", e);
      setError("Something went wrong after sign-in. Please try again.");
      setLoading(false);
    }
  };

  // 1. Check existing session on mount — v5.2: with timeouts
  useEffect(() => {
    let mounted = true;

    // v5.2: Show "Force Sign Out" button after 3 seconds
    const forceLogoutTimer = setTimeout(() => {
      if (mounted && checkingSession) {
        setShowForceLogout(true);
      }
    }, 3000);

    // v5.2: Force checkingSession=false after 5 seconds (kills infinite spinner)
    const timeoutTimer = setTimeout(() => {
      if (mounted && checkingSession) {
        console.warn("Account.js: Session check timed out after 5s");
        setCheckingSession(false);
      }
    }, 5000);

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && mounted) {
          console.log("Session check: found existing user", user.email);
          const profile = await ensureProfile(user.id, user.email);
          doRedirect(profile);
        } else {
          console.log("Session check: no existing session");
        }
      } catch (e) {
        console.error("Session check error:", e);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(forceLogoutTimer);
      clearTimeout(timeoutTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Global onAuthStateChange — BACKUP for OAuth and edge cases
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("onAuthStateChange:", event);
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

  // ─── SIGN IN ─── v5.3: direct redirect after success
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      console.log("handleSignIn: attempting with", email);
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        console.error("handleSignIn: auth error", err.message);
        setError(err.message);
        setLoading(false);
        return;
      }
      // v5.3: Handle redirect directly instead of waiting for onAuthStateChange
      console.log("handleSignIn: auth succeeded, handling post-auth");
      await handlePostAuth();
    } catch (err) {
      console.error("handleSignIn: unexpected error", err);
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
      if (data?.user && !data.session) {
        setMessage("Check your email for a confirmation link, then sign in.");
        setLoading(false);
      }
    } catch (err) {
      setError("Unexpected error. Please try again.");
      setLoading(false);
    }
  };

  // ─── DEV LOGIN (real Supabase auth) ─── v5.3: direct redirect after success
  const handleDevLogin = async (devEmail, devPw) => {
    setLoading(true);
    setError("");
    try {
      console.log("handleDevLogin: attempting with", devEmail);
      const { error: err } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPw,
      });
      if (err) {
        console.error("handleDevLogin: auth error", err.message);
        setError(
          `Dev login failed: ${err.message}. Ensure account exists in Supabase Auth.`,
        );
        setLoading(false);
        return;
      }
      // v5.3: Handle redirect directly instead of waiting for onAuthStateChange
      console.log("handleDevLogin: auth succeeded, handling post-auth");
      await handlePostAuth();
    } catch (err) {
      console.error("handleDevLogin: unexpected error", err);
      setError("Dev login failed unexpectedly.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("protea_role"); // v5.4: clear stale role on logout
    setRole(null);
    redirectedRef.current = false;
    navigate("/", { replace: true });
  };

  // v5.2: Force sign out — nuclear option that clears everything
  const handleForceSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Force sign out error:", e);
    }
    localStorage.clear();
    sessionStorage.clear();
    setRole(null);
    redirectedRef.current = false;
    setCheckingSession(false);
    setShowForceLogout(false);
    setLoading(false);
    setError("");
  };

  const isDev = process.env.NODE_ENV === "development";

  // Show spinner while checking existing session — v5.2: with escape hatch
  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#faf9f6",
          display: "flex",
          flexDirection: "column",
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
        <p
          style={{
            color: "#888",
            marginTop: "16px",
            fontSize: "13px",
            fontFamily: "'Jost',sans-serif",
          }}
        >
          Checking session...
        </p>

        {/* v5.2: Force Sign Out — appears after 3 seconds */}
        {showForceLogout && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <p
              style={{
                color: "#888",
                fontSize: "12px",
                marginBottom: "12px",
                fontFamily: "'Jost',sans-serif",
              }}
            >
              Taking too long? Session may be stuck.
            </p>
            <button
              onClick={handleForceSignOut}
              style={{
                background: "#c0392b",
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                padding: "10px 24px",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontFamily: "'Jost',sans-serif",
                cursor: "pointer",
              }}
            >
              FORCE SIGN OUT & RESET
            </button>
          </div>
        )}

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
