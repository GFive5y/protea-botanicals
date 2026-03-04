// src/App.js — Protea Botanicals v4.2
// ─────────────────────────────────────────────────────────────────────────────
// ★ v4.2 CHANGELOG:
//   FIX: NavBar brand text now pixel-perfect match to Landing.js header.
//
//   Extracted directly from Landing.js v5.7 header source:
//
//   Font:    'Cormorant Garamond', Georgia, serif  ← was Jost (wrong)
//   Size:    15px                                  ← was 13px (wrong)
//   Tracking: 0.2em                               ← was 0.35em (wrong)
//   Case:    uppercase (via text)                  ← unchanged
//
//   Colour logic (matches Landing exactly):
//     Green header (scrolled OR non-Landing pages):
//       "PROTEA"     → #faf9f6  (cream)
//       "BOTANICALS" → #52b788  (accent green)
//     Transparent header (Landing at top, not scrolled):
//       "PROTEA"     → #1a1a1a  opacity 0.85  (dark, readable on cream bg)
//       "BOTANICALS" → #2d6a4f               (mid green)
//
//   Also injects Google Font @import for Cormorant Garamond so it loads on
//   all pages (Landing.js loads it via its own <style> tag, but other pages
//   don't have access to it — fixed with a single injected <style> in NavBar).
//
//   NO OTHER CHANGES. All routes, auth, cart, roles — untouched.
//
// ★ v4.1: NavBar solid green on non-Landing pages, transparent only on /
// ★ v4.0: NavBar transparent-top + blur + Jost brand text
// ★ v3.9: NavBar cream text + scroll-hide
// ★ v3.8: /terpenes/:id route
// ★ v3.7: AdminDashboardRouter (Phase 2F)
// ★ v3.6: TenantProvider, RequireHQ (Phase 2A)
// ★ v3.5: AI Co-Pilot | ★ v3.4: Admin QR Generator
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useState, useEffect, useContext, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { supabase } from "./services/supabaseClient";

// ── Pages ────────────────────────────────────────────────────────────────────
import Landing from "./pages/Landing";
import ScanPage from "./pages/ScanPage";
import ScanResult from "./pages/ScanResult";
import Loyalty from "./pages/Loyalty";
import Account from "./pages/Account";
import AdminDashboard from "./pages/AdminDashboard";
import WholesalePortal from "./pages/WholesalePortal";
import NotFound from "./pages/NotFound";
import TerpenePage from "./pages/TerpenePage";
import MoleculesPage from "./pages/MoleculesPage";
import Shop from "./pages/Shop";
import ProductVerification from "./pages/ProductVerification";
import Redeem from "./pages/Redeem";
import Welcome from "./pages/Welcome";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccess from "./pages/OrderSuccess";
import AdminQrGenerator from "./pages/AdminQrGenerator";
import CoPilot from "./components/CoPilot";
import HQDashboard from "./pages/HQDashboard";
import ShopDashboard from "./pages/ShopDashboard";

// ── Layout / Context ──────────────────────────────────────────────────────────
import PageShell from "./components/PageShell";
import { CartProvider, useCart } from "./contexts/CartContext";
import { TenantProvider, useTenant } from "./services/tenantService";

export const RoleContext = createContext(null);

const LS = {
  ROLE: "protea_role",
  DEV_MODE: "protea_dev_mode",
};

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR  v4.2
// Brand text pixel-perfect match to Landing.js v5.7 header
// ─────────────────────────────────────────────────────────────────────────────
function NavBar() {
  const { role, setRole, isDevMode, setIsDevMode, userEmail } =
    useContext(RoleContext);
  const { getCartCount } = useCart();
  const { isHQ } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = !!role;
  const cartCount = getCartCount();

  // Only Landing (/) gets the transparent-at-top treatment
  const isLanding = location.pathname === "/";

  // ── Scroll state ─────────────────────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastYRef = useRef(0);

  useEffect(() => {
    setScrolled(false);
    setHeaderVisible(true);
    lastYRef.current = 0;
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      if (y > 80) {
        setHeaderVisible(y < lastYRef.current);
      } else {
        setHeaderVisible(true);
      }
      lastYRef.current = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(LS.ROLE);
    localStorage.removeItem(LS.DEV_MODE);
    setRole(null);
    setIsDevMode(false);
    navigate("/");
  };

  const exitDevMode = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(LS.ROLE);
    localStorage.removeItem(LS.DEV_MODE);
    setRole(null);
    setIsDevMode(false);
  };

  const roleLabel =
    role === "admin" ? "Admin" : role === "retailer" ? "Wholesale" : null;

  const displayEmail = userEmail
    ? userEmail.length > 24
      ? userEmail.slice(0, 22) + "…"
      : userEmail
    : null;

  // ★ v4.2: Background — transparent only on Landing at scroll-top
  const onGreenBg = !isLanding || scrolled;
  const headerBg = onGreenBg ? "#1b4332" : "rgba(27,67,50,0.0)";

  // ★ v4.2: Brand colours — extracted directly from Landing.js v5.7
  // Green header: PROTEA=#faf9f6, BOTANICALS=#52b788
  // Transparent header (Landing at top): PROTEA=#1a1a1a opacity 0.85, BOTANICALS=#2d6a4f
  const proteaColor = onGreenBg ? "#faf9f6" : "#1a1a1a";
  const proteaOpacity = onGreenBg ? 1 : 0.85;
  const botColor = onGreenBg ? "#52b788" : "#2d6a4f";

  // Nav link + icon colour
  const navTextColor = onGreenBg
    ? "rgba(255,255,255,0.88)"
    : "rgba(27,67,50,0.85)";
  const navTextColorDim = onGreenBg
    ? "rgba(255,255,255,0.60)"
    : "rgba(27,67,50,0.55)";

  return (
    <>
      {/* ★ v4.2: Inject Cormorant Garamond for non-Landing pages */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500;600&display=swap');
      `}</style>

      {isDevMode && (
        <div
          style={{
            background: "#e67e22",
            color: "#fff",
            padding: "6px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "Jost, sans-serif",
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <span>
            ⚠ TEST MODE — role: {localStorage.getItem(LS.ROLE) || "customer"}
          </span>
          <button
            onClick={exitDevMode}
            style={{
              background: "rgba(0,0,0,0.2)",
              border: "none",
              color: "#fff",
              padding: "3px 10px",
              cursor: "pointer",
              borderRadius: "2px",
              fontFamily: "Jost, sans-serif",
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Exit
          </button>
        </div>
      )}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: headerBg,
          backdropFilter: !onGreenBg ? "blur(8px)" : "none",
          WebkitBackdropFilter: !onGreenBg ? "blur(8px)" : "none",
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "56px",
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition:
            "background 0.4s ease, backdrop-filter 0.4s ease, transform 0.35s ease",
          borderBottom: scrolled ? "1px solid rgba(82,183,136,0.15)" : "none",
        }}
      >
        {/* ── LEFT: brand + nav links ── */}
        <nav style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {/* ★ v4.2: Exact match to Landing.js header brand text */}
          <Link
            to="/"
            style={{
              textDecoration: "none",
              marginRight: "16px",
              whiteSpace: "nowrap",
              // Match Landing transition
              transition: "opacity 0.4s ease, color 0.4s ease",
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "15px",
                letterSpacing: "0.2em",
                color: proteaColor,
                opacity: proteaOpacity,
                transition: "opacity 0.4s ease, color 0.4s ease",
              }}
            >
              PROTEA{" "}
              <span
                style={{
                  color: botColor,
                  transition: "color 0.4s ease",
                }}
              >
                BOTANICALS
              </span>
            </span>
          </Link>

          <NavLink to="/" color={navTextColor}>
            Home
          </NavLink>
          <NavLink to="/shop" color={navTextColor}>
            Shop
          </NavLink>
          {isLoggedIn && (
            <NavLink to="/loyalty" color={navTextColor}>
              Loyalty
            </NavLink>
          )}
          {isLoggedIn && (
            <NavLink to="/scan" color={navTextColor}>
              Scan QR
            </NavLink>
          )}
          {role === "admin" && (
            <NavLink to="/admin" color={navTextColor}>
              Admin
            </NavLink>
          )}
          {role === "retailer" && (
            <NavLink to="/wholesale" color={navTextColor}>
              Wholesale
            </NavLink>
          )}
          {isHQ && (
            <NavLink to="/hq" color={navTextColor}>
              HQ
            </NavLink>
          )}
        </nav>

        {/* ── RIGHT: cart + auth ── */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Cart */}
          <button
            onClick={() => navigate("/cart")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              position: "relative",
              padding: "6px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label={`Cart with ${cartCount} items`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={navTextColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "0px",
                  right: "0px",
                  background: "#b5935a",
                  color: "#fff",
                  fontSize: "9px",
                  fontFamily: "Jost, sans-serif",
                  fontWeight: "700",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                }}
              >
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

          {isLoggedIn ? (
            <>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {isHQ && (
                  <span
                    style={{
                      background: "rgba(82,183,136,0.2)",
                      color: "#52b788",
                      padding: "2px 8px",
                      borderRadius: "2px",
                      fontFamily: "Jost, sans-serif",
                      fontSize: "9px",
                      fontWeight: "700",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    HQ
                  </span>
                )}
                {roleLabel && !isHQ && (
                  <span
                    style={{
                      background:
                        role === "admin"
                          ? "rgba(181,147,90,0.25)"
                          : "rgba(124,58,16,0.3)",
                      color: role === "admin" ? "#b5935a" : "#e8a95b",
                      padding: "2px 8px",
                      borderRadius: "2px",
                      fontFamily: "Jost, sans-serif",
                      fontSize: "9px",
                      fontWeight: "700",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                    }}
                  >
                    {roleLabel}
                  </span>
                )}
                {displayEmail && (
                  <span
                    style={{
                      color: navTextColorDim,
                      fontFamily: "Jost, sans-serif",
                      fontSize: "11px",
                      fontWeight: "400",
                      letterSpacing: "0.02em",
                      maxWidth: "180px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayEmail}
                  </span>
                )}
              </div>

              <button
                onClick={handleLogout}
                style={{
                  background: onGreenBg
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(27,67,50,0.08)",
                  border: onGreenBg
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(27,67,50,0.3)",
                  borderRadius: "2px",
                  padding: "6px 14px",
                  fontFamily: "Jost, sans-serif",
                  fontSize: "10px",
                  fontWeight: "600",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: onGreenBg ? "rgba(255,255,255,0.88)" : "#1b4332",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = onGreenBg
                    ? "rgba(255,255,255,0.18)"
                    : "rgba(27,67,50,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = onGreenBg
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(27,67,50,0.08)";
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            /* Sign In button — matches Landing.js signin-btn exactly */
            <button
              onClick={() => navigate("/account")}
              style={{
                background: onGreenBg
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(27,67,50,0.08)",
                border: onGreenBg
                  ? "1px solid rgba(255,255,255,0.3)"
                  : "1px solid rgba(27,67,50,0.3)",
                borderRadius: "2px",
                padding: "6px 16px",
                color: onGreenBg ? "#fff" : "#1b4332",
                fontFamily: "Jost, sans-serif",
                fontSize: "10px",
                fontWeight: "500",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 0.2s, color 0.4s, border-color 0.4s",
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>
    </>
  );
}

// ── NavLink helper ────────────────────────────────────────────────────────────
function NavLink({ to, children, color }) {
  const c = color || "rgba(255,255,255,0.88)";
  return (
    <Link
      to={to}
      style={{
        color: c,
        textDecoration: "none",
        fontFamily: "Jost, sans-serif",
        fontSize: "11px",
        fontWeight: "600",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        padding: "6px 12px",
        borderRadius: "2px",
        transition: "color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "rgba(27,67,50,0.08)";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "transparent";
      }}
    >
      {children}
    </Link>
  );
}

// ── Layout wrappers ───────────────────────────────────────────────────────────
function WithNav({ children }) {
  return (
    <>
      <NavBar />
      <PageShell>{children}</PageShell>
    </>
  );
}

// ── Auth guards ───────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { role, loading } = useContext(RoleContext);
  const location = useLocation();

  if (loading && !role) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          fontFamily: "Jost, sans-serif",
          color: "#1b4332",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid #e0dbd2",
            borderTopColor: "#1b4332",
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes protea-spin { to { transform: rotate(360deg); } }`}</style>
        <span
          style={{
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#888",
          }}
        >
          Loading…
        </span>
      </div>
    );
  }

  if (!role) {
    console.log("[RequireAuth] No role → /account from:", location.pathname);
    return (
      <Navigate
        to={`/account?return=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return children;
}

function RequireRole({ allowedRoles, children }) {
  const { role } = useContext(RoleContext);
  if (!allowedRoles.includes(role)) {
    console.log("[RequireRole]", role, "not in", allowedRoles, "→ /loyalty");
    return <Navigate to="/loyalty" replace />;
  }
  return children;
}

function RequireHQ({ children }) {
  const { isHQ, loading: tenantLoading } = useTenant();
  const { role } = useContext(RoleContext);

  if (tenantLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          fontFamily: "Jost, sans-serif",
          color: "#1b4332",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid #e0dbd2",
            borderTopColor: "#1b4332",
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
          }}
        />
        <span
          style={{
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#888",
          }}
        >
          Loading HQ…
        </span>
      </div>
    );
  }

  if (!isHQ) {
    const fallback = role === "admin" ? "/admin" : "/loyalty";
    console.log("[RequireHQ] No HQ access →", fallback);
    return <Navigate to={fallback} replace />;
  }
  return children;
}

function AdminDashboardRouter() {
  const { isHQ, tenantType, loading: tenantLoading } = useTenant();

  if (tenantLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
          fontFamily: "Jost, sans-serif",
          color: "#1b4332",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "3px solid #e0dbd2",
            borderTopColor: "#1b4332",
            borderRadius: "50%",
            animation: "protea-spin 0.8s linear infinite",
          }}
        />
        <span
          style={{
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#888",
          }}
        >
          Loading dashboard…
        </span>
      </div>
    );
  }

  if (isHQ) return <AdminDashboard />;
  if (tenantType === "shop") return <ShopDashboard />;
  return <AdminDashboard />;
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRoleState] = useState(
    () => localStorage.getItem(LS.ROLE) || null,
  );
  const [isDevMode, setIsDevMode] = useState(
    () => localStorage.getItem(LS.DEV_MODE) === "true",
  );
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);

  const setRole = (newRole) => {
    setRoleState(newRole);
    if (newRole) localStorage.setItem(LS.ROLE, newRole);
    else localStorage.removeItem(LS.ROLE);
  };

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn("[App] Safety timeout: forcing loading=false");
        return false;
      });
    }, 5000);

    const hydrateSession = async () => {
      try {
        if (localStorage.getItem(LS.DEV_MODE) === "true") {
          setLoading(false);
          return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (profile?.role) setRole(profile.role);
          setUserEmail(session.user.email);
          console.log(
            "[App] Session hydrated:",
            session.user.email,
            "role:",
            profile?.role,
          );
        } else {
          setRole(null);
          setUserEmail(null);
          console.log("[App] No session found");
        }
      } catch (err) {
        console.error("[App] hydrateSession error:", err);
      } finally {
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setIsDevMode(false);
        localStorage.removeItem(LS.DEV_MODE);
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        setRole(profile?.role || "customer");
        setUserEmail(session.user.email);
      } else if (event === "SIGNED_OUT") {
        if (localStorage.getItem(LS.DEV_MODE) !== "true") {
          setRoleState(null);
          localStorage.removeItem(LS.ROLE);
          setUserEmail(null);
        }
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        if (localStorage.getItem(LS.DEV_MODE) !== "true") {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (profile?.role) setRole(profile.role);
          setUserEmail(session.user.email);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RoleContext.Provider
      value={{ role, setRole, isDevMode, setIsDevMode, loading, userEmail }}
    >
      <CartProvider>
        <TenantProvider>
          <BrowserRouter>
            <Routes>
              {/* ── STANDALONE — no nav ─────────────────────────────────────── */}
              <Route path="/" element={<Landing />} />
              <Route
                path="/shop"
                element={
                  <>
                    <NavBar />
                    <Shop />
                  </>
                }
              />
              <Route
                path="/verify/:productId"
                element={
                  <>
                    <NavBar />
                    <ProductVerification />
                  </>
                }
              />
              <Route
                path="/cart"
                element={
                  <>
                    <NavBar />
                    <CartPage />
                  </>
                }
              />

              {/* ── SCAN — standalone ───────────────────────────────────────── */}
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/scan/:qrCode" element={<ScanResult />} />

              {/* ── MOLECULES / TERPENES ────────────────────────────────────── */}
              <Route
                path="/molecules"
                element={
                  <WithNav>
                    <MoleculesPage />
                  </WithNav>
                }
              />
              <Route path="/terpenes" element={<TerpenePage />} />
              <Route path="/terpenes/:terpeneId" element={<TerpenePage />} />

              {/* ── WITH nav + auth guard ───────────────────────────────────── */}
              <Route
                path="/loyalty"
                element={
                  <WithNav>
                    <RequireAuth>
                      <Loyalty />
                    </RequireAuth>
                  </WithNav>
                }
              />
              <Route
                path="/redeem"
                element={
                  <WithNav>
                    <RequireAuth>
                      <Redeem />
                    </RequireAuth>
                  </WithNav>
                }
              />
              <Route
                path="/checkout"
                element={
                  <WithNav>
                    <RequireAuth>
                      <CheckoutPage />
                    </RequireAuth>
                  </WithNav>
                }
              />
              <Route
                path="/order-success"
                element={
                  <WithNav>
                    <OrderSuccess />
                  </WithNav>
                }
              />
              <Route
                path="/wholesale"
                element={
                  <WithNav>
                    <RequireAuth>
                      <RequireRole allowedRoles={["retailer", "admin"]}>
                        <WholesalePortal />
                      </RequireRole>
                    </RequireAuth>
                  </WithNav>
                }
              />
              <Route
                path="/admin"
                element={
                  <>
                    <NavBar />
                    <PageShell maxWidth={1200}>
                      <RequireAuth>
                        <RequireRole allowedRoles={["admin"]}>
                          <AdminDashboardRouter />
                        </RequireRole>
                      </RequireAuth>
                    </PageShell>
                  </>
                }
              />
              <Route
                path="/admin/qr"
                element={
                  <>
                    <NavBar />
                    <PageShell maxWidth={1200}>
                      <RequireAuth>
                        <RequireRole allowedRoles={["admin"]}>
                          <AdminQrGenerator />
                        </RequireRole>
                      </RequireAuth>
                    </PageShell>
                  </>
                }
              />
              <Route
                path="/hq/*"
                element={
                  <>
                    <NavBar />
                    <PageShell maxWidth={1400}>
                      <RequireAuth>
                        <RequireRole allowedRoles={["admin"]}>
                          <RequireHQ>
                            <HQDashboard />
                          </RequireHQ>
                        </RequireRole>
                      </RequireAuth>
                    </PageShell>
                  </>
                }
              />

              {/* ── WITH nav, no auth ────────────────────────────────────────── */}
              <Route
                path="/account"
                element={
                  <WithNav>
                    <Account />
                  </WithNav>
                }
              />
              <Route
                path="/welcome"
                element={
                  <WithNav>
                    <Welcome />
                  </WithNav>
                }
              />

              {/* Fallback */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
            <CoPilot />
          </BrowserRouter>
        </TenantProvider>
      </CartProvider>
    </RoleContext.Provider>
  );
}
