// src/pages/Account.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

// ── Dev test accounts — remove or hide before going live ─────────────────────
const DEV_ACCOUNTS = [
  {
    label: "Admin",
    icon: "◈",
    color: "#1b4332",
    description: "Full admin access",
    mockUser: {
      id: "dev-admin-001",
      email: "admin@protea.dev",
      created_at: "2025-01-01T00:00:00Z",
    },
    mockProfile: {
      role: "admin",
      loyalty_points: 0,
      display_name: "Admin User",
    },
    redirect: "/admin",
  },
  {
    label: "Customer",
    icon: "◉",
    color: "#2c4a6e",
    description: "Loyalty points & orders",
    mockUser: {
      id: "dev-customer-001",
      email: "customer@protea.dev",
      created_at: "2025-06-15T00:00:00Z",
    },
    mockProfile: {
      role: "customer",
      loyalty_points: 340,
      display_name: "Test Customer",
    },
    redirect: "/loyalty",
  },
  {
    label: "Wholesaler",
    icon: "◇",
    color: "#7c3a10",
    description: "Retail partner portal",
    mockUser: {
      id: "dev-wholesale-001",
      email: "wholesale@protea.dev",
      created_at: "2025-03-20T00:00:00Z",
    },
    mockProfile: {
      role: "wholesaler",
      loyalty_points: 0,
      display_name: "Test Retailer",
    },
    redirect: "/wholesale",
  },
];

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500&display=swap');
  .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font { font-family: 'Jost', sans-serif; }
  .pb-btn {
    font-family: 'Jost', sans-serif;
    padding: 12px 32px;
    background: #1b4332;
    color: white;
    border: none;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
    width: 100%;
  }
  .pb-btn:hover { background: #2d6a4f; }
  .pb-btn-outline {
    font-family: 'Jost', sans-serif;
    padding: 12px 32px;
    background: transparent;
    color: #1b4332;
    border: 1px solid #1b4332;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }
  .pb-btn-outline:hover { background: #1b4332; color: white; }
  .pb-input {
    font-family: 'Jost', sans-serif;
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #ddd;
    border-radius: 2px;
    font-size: 14px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s;
    background: white;
  }
  .pb-input:focus { border-color: #2d6a4f; }
  .dev-card {
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: pointer;
  }
  .dev-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
  }
`;

export default function Account() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isDevUser, setIsDevUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
  };

  const handleAuth = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      else {
        await fetchUser();
        setMessage("Welcome back!");
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account.");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (isDevUser) {
      setUser(null);
      setProfile(null);
      setIsDevUser(false);
    } else {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    }
  };

  // ── One-click dev login — sets mock state, no Supabase call ──────────────
  const handleDevLogin = (account) => {
    setUser(account.mockUser);
    setProfile(account.mockProfile);
    setIsDevUser(true);
    navigate(account.redirect);
  };

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: "#faf9f6",
        minHeight: "100vh",
      }}
    >
      <style>{sharedStyles}</style>

      {/* ── TEST MODE banner — shown at top of every page when dev user is active ── */}
      {isDevUser && (
        <div
          style={{
            background: "#e67e22",
            padding: "8px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 9999,
          }}
        >
          <span
            className="body-font"
            style={{
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: "white",
              textTransform: "uppercase",
            }}
          >
            ⚠ Dev Test Mode — {profile?.role?.toUpperCase()} · {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="body-font"
            style={{
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "white",
              padding: "4px 14px",
              borderRadius: "2px",
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Exit Test Mode
          </button>
        </div>
      )}

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
          padding: "64px 40px",
          textAlign: "center",
        }}
      >
        <span
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#52b788",
          }}
        >
          MY ACCOUNT
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 300,
            color: "#faf9f6",
            margin: "12px 0",
          }}
        >
          {user ? `Welcome${isDevUser ? " (Dev)" : " Back"}` : "Sign In"}
        </h1>
        <p
          className="body-font"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "15px",
            fontWeight: 300,
          }}
        >
          {user ? user.email : "Access your loyalty account and order history."}
        </p>
      </div>

      <div
        style={{ maxWidth: "520px", margin: "0 auto", padding: "60px 24px" }}
      >
        {user ? (
          /* ── Logged in view — identical to original ── */
          <>
            <div
              style={{
                background: "white",
                border: "1px solid #e8e0d4",
                borderRadius: "2px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
                  padding: "32px 40px",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>◉</div>
                <p
                  className="body-font"
                  style={{
                    color: "#52b788",
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  Loyalty Points
                </p>
                <p
                  className="shop-font"
                  style={{
                    color: "white",
                    fontSize: "56px",
                    fontWeight: 300,
                    lineHeight: 1,
                  }}
                >
                  {profile?.loyalty_points || 0}
                </p>
              </div>
              <div style={{ padding: "24px 40px" }}>
                {[
                  ["Email", user.email],
                  ["Role", profile?.role || "customer"],
                  [
                    "Member Since",
                    new Date(user.created_at).toLocaleDateString("en-ZA", {
                      month: "long",
                      year: "numeric",
                    }),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: "1px solid #f0ebe2",
                    }}
                  >
                    <span
                      className="body-font"
                      style={{
                        fontSize: "12px",
                        color: "#aaa",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {label}
                    </span>
                    <span
                      className="body-font"
                      style={{ fontSize: "14px", color: "#333" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <button className="pb-btn" onClick={() => navigate("/loyalty")}>
                View Loyalty & History
              </button>
              <button
                className="pb-btn"
                style={{ background: "#b5935a" }}
                onClick={() => navigate("/redeem")}
              >
                Redeem Points
              </button>
              <button
                className="pb-btn"
                style={{ background: "#2c4a6e" }}
                onClick={() => navigate("/scan")}
              >
                Scan a Product
              </button>
              {/* Extra buttons based on role */}
              {profile?.role === "admin" && (
                <button
                  className="pb-btn"
                  style={{ background: "#1b4332" }}
                  onClick={() => navigate("/admin")}
                >
                  ↗ Admin Dashboard
                </button>
              )}
              {profile?.role === "wholesaler" && (
                <button
                  className="pb-btn"
                  style={{ background: "#7c3a10" }}
                  onClick={() => navigate("/wholesale")}
                >
                  ↗ Wholesale Portal
                </button>
              )}
              <button className="pb-btn-outline" onClick={handleLogout}>
                {isDevUser ? "Exit Test Mode" : "Sign Out"}
              </button>
            </div>
          </>
        ) : (
          /* ── Logged out view ── */
          <>
            {/* ══ DEV TEST PANEL ══════════════════════════════════════════════ */}
            <div
              style={{
                background: "white",
                border: "2px dashed #e8a020",
                borderRadius: "2px",
                padding: "28px 32px",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontSize: "15px", color: "#e8a020" }}>⚙</span>
                <span
                  className="body-font"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "#e8a020",
                    fontWeight: 600,
                  }}
                >
                  Dev Testing — Quick Login
                </span>
              </div>
              <p
                className="body-font"
                style={{
                  fontSize: "12px",
                  color: "#bbb",
                  marginBottom: "20px",
                  fontWeight: 300,
                }}
              >
                Simulates login without Supabase. Remove before going live.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {DEV_ACCOUNTS.map((account) => (
                  <div
                    key={account.label}
                    className="dev-card"
                    onClick={() => handleDevLogin(account)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      padding: "14px 18px",
                      background: account.color,
                      borderRadius: "2px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "22px",
                        color: "rgba(255,255,255,0.5)",
                      }}
                    >
                      {account.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p
                        className="body-font"
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "white",
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          marginBottom: "2px",
                        }}
                      >
                        {account.label}
                      </p>
                      <p
                        className="body-font"
                        style={{
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: 300,
                        }}
                      >
                        {account.description} · {account.mockUser.email}
                      </p>
                    </div>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.35)",
                        fontSize: "16px",
                      }}
                    >
                      →
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "28px",
              }}
            >
              <div style={{ flex: 1, height: "1px", background: "#e8e0d4" }} />
              <span
                className="body-font"
                style={{
                  fontSize: "11px",
                  color: "#ccc",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Or sign in for real
              </span>
              <div style={{ flex: 1, height: "1px", background: "#e8e0d4" }} />
            </div>

            {/* ── Real Supabase auth form — identical to original ── */}
            <div
              style={{
                background: "white",
                border: "1px solid #e8e0d4",
                borderRadius: "2px",
                padding: "48px 40px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              {/* Toggle */}
              <div
                style={{
                  display: "flex",
                  background: "#f4f0e8",
                  borderRadius: "2px",
                  overflow: "hidden",
                  marginBottom: "32px",
                }}
              >
                {["Sign In", "Create Account"].map((label, i) => (
                  <button
                    key={label}
                    onClick={() => {
                      setIsLogin(i === 0);
                      setError("");
                      setMessage("");
                    }}
                    className="body-font"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background:
                        isLogin === (i === 0) ? "#1b4332" : "transparent",
                      color: isLogin === (i === 0) ? "white" : "#888",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "11px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      transition: "all 0.2s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  className="body-font"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.15em",
                    color: "#888",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Email Address
                </label>
                <input
                  className="pb-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <div style={{ marginBottom: "28px" }}>
                <label
                  className="body-font"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.15em",
                    color: "#888",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  Password
                </label>
                <input
                  className="pb-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                />
              </div>

              {error && (
                <p
                  className="body-font"
                  style={{
                    color: "#c0392b",
                    fontSize: "13px",
                    marginBottom: "16px",
                  }}
                >
                  {error}
                </p>
              )}
              {message && (
                <p
                  className="body-font"
                  style={{
                    color: "#2d6a4f",
                    fontSize: "13px",
                    marginBottom: "16px",
                  }}
                >
                  {message}
                </p>
              )}

              <button
                className="pb-btn"
                onClick={handleAuth}
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : isLogin
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </div>
          </>
        )}
      </div>

      <footer
        style={{
          background: "#1a1a1a",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#faf9f6", letterSpacing: "0.2em" }}
        >
          PROTEA
        </span>
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#52b788", letterSpacing: "0.2em" }}
        >
          {" "}
          BOTANICALS
        </span>
        <p
          className="body-font"
          onClick={() => navigate("/")}
          style={{
            fontSize: "11px",
            color: "#555",
            marginTop: "12px",
            cursor: "pointer",
          }}
        >
          ← Back to Home
        </p>
      </footer>
    </div>
  );
}
