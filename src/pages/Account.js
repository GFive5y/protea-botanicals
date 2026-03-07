// src/pages/Account.js — Protea Botanicals v5.6
// ============================================================================
// CHANGELOG v5.5 → v5.6:
//   1. ADD: "My Account" view for already-logged-in users visiting /account
//      with no ?return= URL. Instead of redirecting, shows profile page with
//      ProfileCompletion component embedded.
//   2. ADD: import ProfileCompletion from "../components/ProfileCompletion"
//   3. ADD: loggedInUser + loggedInProfile state (set during session check)
//   4. ADD: AccountView component — shows email, role, loyalty points,
//      ProfileCompletion widget, and Sign Out button.
//   LOGIC UNCHANGED: ?return= URL still redirects immediately as before.
//   LOGIN/SIGNUP/REDIRECT: all v5.5 logic preserved exactly.
// ============================================================================

import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { RoleContext } from "../App";
import ProfileCompletion from "../components/ProfileCompletion";

// Ensure a user_profiles row exists (shared with Loyalty.js logic)
async function ensureProfile(userId, email) {
  console.log("ensureProfile: checking for", userId);
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, role, loyalty_points, loyalty_tier, profile_complete")
    .eq("id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    console.log("ensureProfile: no profile found, creating one");
    const { data: created, error: insertErr } = await supabase
      .from("user_profiles")
      .insert({ id: userId, role: "customer", loyalty_points: 0 })
      .select("id, role, loyalty_points, loyalty_tier, profile_complete")
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
  const [showForceLogout, setShowForceLogout] = useState(false);
  const redirectedRef = useRef(false);

  // v5.6: logged-in account view state
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loggedInProfile, setLoggedInProfile] = useState(null);

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
    const roleRoute = {
      admin: "/admin",
      retailer: "/wholesale",
      customer: "/loyalty",
    };
    const roleDefaults = ["/wholesale", "/admin", "/loyalty"];
    const useReturnUrl = returnUrl && !roleDefaults.includes(returnUrl);
    const dest = useReturnUrl
      ? returnUrl
      : roleRoute[profile?.role] || "/loyalty";
    console.log("doRedirect: destination =", dest);
    navigate(dest, { replace: true });
  };

  // v5.3: Shared post-auth handler
  const handlePostAuth = async () => {
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) {
        setError(
          "Sign-in succeeded but session could not be verified. Please try again.",
        );
        setLoading(false);
        return;
      }
      if (user) {
        const profile = await ensureProfile(user.id, user.email);
        doRedirect(profile);
      } else {
        setError(
          "Sign-in succeeded but no session was created. Please try again.",
        );
        setLoading(false);
      }
    } catch (e) {
      setError("Something went wrong after sign-in. Please try again.");
      setLoading(false);
    }
  };

  // 1. Check existing session on mount
  useEffect(() => {
    let mounted = true;

    const forceLogoutTimer = setTimeout(() => {
      if (mounted && checkingSession) setShowForceLogout(true);
    }, 3000);

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
          const profile = await ensureProfile(user.id, user.email);
          if (profile?.role) setRole(profile.role);

          // v5.6: If no ?return= URL, show account view instead of redirecting
          const roleDefaults = ["/wholesale", "/admin"];
          const shouldRedirect = returnUrl && !roleDefaults.includes(returnUrl);

          if (shouldRedirect) {
            doRedirect(profile);
          } else {
            // Stay on /account — show logged-in view
            redirectedRef.current = true; // ← ADD THIS LINE
            setLoggedInUser(user);
            setLoggedInProfile(profile);
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
      clearTimeout(forceLogoutTimer);
      clearTimeout(timeoutTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Global onAuthStateChange — BACKUP for OAuth only (no redirect here)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("onAuthStateChange:", event);
      // Redirect only handled by handlePostAuth (direct) and session check above.
      // This listener is kept only for future OAuth flows.
    });
    return () => subscription.unsubscribe();
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
        return;
      }
      await handlePostAuth();
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
      if (data?.user && !data.session) {
        setMessage("Check your email for a confirmation link, then sign in.");
        setLoading(false);
      }
    } catch (err) {
      setError("Unexpected error. Please try again.");
      setLoading(false);
    }
  };

  // ─── DEV LOGIN ───
  const handleDevLogin = async (devEmail, devPw) => {
    setLoading(true);
    setError("");
    try {
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
    } catch (err) {
      setError("Dev login failed unexpectedly.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("protea_role");
    setRole(null);
    redirectedRef.current = false;
    setLoggedInUser(null);
    setLoggedInProfile(null);
    navigate("/", { replace: true });
  };

  const handleForceSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    localStorage.clear();
    sessionStorage.clear();
    setRole(null);
    redirectedRef.current = false;
    setCheckingSession(false);
    setShowForceLogout(false);
    setLoading(false);
    setError("");
    setLoggedInUser(null);
    setLoggedInProfile(null);
  };

  const isDev = process.env.NODE_ENV === "development";

  // ── Spinner while checking session ──────────────────────────────────────
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

  // ── v5.6: Logged-in Account View ─────────────────────────────────────────
  if (loggedInUser) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');`}</style>
        <div
          style={{
            minHeight: "100vh",
            background: "#faf9f6",
            fontFamily: "'Jost',sans-serif",
            padding: "40px 20px",
          }}
        >
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
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
                My Account
              </h1>
            </div>

            {/* Account summary card */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e8e0d4",
                borderRadius: 2,
                padding: "20px 24px",
                marginBottom: 24,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "#52b788",
                  marginBottom: 12,
                  fontWeight: 600,
                }}
              >
                Account Details
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0ebe3",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Email
                  </span>
                  <span
                    style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}
                  >
                    {loggedInUser.email}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0ebe3",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Role
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#1b4332",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      background: "rgba(82,183,136,0.12)",
                      padding: "3px 10px",
                      borderRadius: 2,
                    }}
                  >
                    {loggedInProfile?.role || "customer"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0ebe3",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Loyalty Points
                  </span>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond',Georgia,serif",
                      fontSize: 22,
                      fontWeight: 600,
                      color: "#b5935a",
                    }}
                  >
                    {(loggedInProfile?.loyalty_points || 0).toLocaleString()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    Tier
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#b5935a",
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                    }}
                  >
                    {loggedInProfile?.loyalty_tier || "Bronze"}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Completion — the main addition */}
            <ProfileCompletion
              userId={loggedInUser.id}
              onComplete={(completed) => {
                if (completed) {
                  setLoggedInProfile((prev) => ({
                    ...prev,
                    profile_complete: true,
                  }));
                }
              }}
            />

            {/* Navigation shortcuts */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 24,
                marginBottom: 24,
              }}
            >
              <button
                onClick={() => navigate("/loyalty")}
                style={{
                  padding: "12px 16px",
                  background: "#fff",
                  border: "1px solid #e8e0d4",
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#1b4332",
                  cursor: "pointer",
                  fontFamily: "'Jost',sans-serif",
                }}
              >
                📊 View Loyalty
              </button>
              <button
                onClick={() => navigate("/shop")}
                style={{
                  padding: "12px 16px",
                  background: "#fff",
                  border: "1px solid #e8e0d4",
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#1b4332",
                  cursor: "pointer",
                  fontFamily: "'Jost',sans-serif",
                }}
              >
                🛒 Browse Shop
              </button>
            </div>

            {/* Sign out */}
            <div
              style={{
                textAlign: "center",
                paddingTop: 16,
                borderTop: "1px solid #e8e0d4",
              }}
            >
              <button
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
                Sign out
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Login / Sign Up form (unchanged from v5.5) ────────────────────────────
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
                onClick={() => {
                  window.history.replaceState(
                    null,
                    "",
                    "/account?return=/loyalty",
                  );
                  handleDevLogin("customer@protea.dev", "customer123");
                }}
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
