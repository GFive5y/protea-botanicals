// src/App.js — Protea Botanicals v3.8
// ─────────────────────────────────────────────────────────────────────────────
// ★ v3.8 CHANGELOG (NavBar redesign):
//   1. MODIFY: NavBar background changed from solid green (#1b4332) to
//      scroll-aware cream/green (matches Landing.js header behaviour exactly)
//   2. ADD: scroll state + auto-hide behaviour in NavBar (useState, useEffect)
//   3. MODIFY: Brand "Protea Botanicals" text — dark green when unscrolled,
//      cream when scrolled (was always gold #b5935a)
//   4. MODIFY: NavLink text — dark (#1a1a1a) when unscrolled, white when scrolled
//   5. MODIFY: Cart SVG stroke — dark when unscrolled, white when scrolled
//   6. MODIFY: "Sign In" button — matches Landing.js sign-in style (no gold bg)
//   7. ADD: position:fixed + translateY hide/show on NavBar header
//   8. ADD: paddingTop:56px spacer div below NavBar on nav-wrapped routes
//   NO OTHER CHANGES. All routes, auth, cart logic — untouched.
//
// ★ v3.7 CHANGELOG (Phase 2F — Shop Admin Scoping):
//   1. ADD: import ShopDashboard from "./pages/ShopDashboard"
//   2. ADD: AdminDashboardRouter component
//   3. MODIFY: /admin route uses AdminDashboardRouter
//   4. Version bump v3.6 → v3.7
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useState, useEffect, useContext } from "react";
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

// ── Pages ─────────────────────────────────────────────────────────────────────
import Landing from "./pages/Landing";
import ScanPage from "./pages/ScanPage";
import ScanResult from "./pages/ScanResult";
import Loyalty from "./pages/Loyalty";
import Account from "./pages/Account";
import AdminDashboard from "./pages/AdminDashboard";
import WholesalePortal from "./pages/WholesalePortal";
import NotFound from "./pages/NotFound";

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

import PageShell from "./components/PageShell";
import { CartProvider, useCart } from "./contexts/CartContext";
import { TenantProvider, useTenant } from "./services/tenantService";

export const RoleContext = createContext(null);

const LS = {
  ROLE: "protea_role",
  DEV_MODE: "protea_dev_mode",
};

// ─────────────────────────────────────────────────────────────────────────────
// INLINE NAV BAR — v3.8: Scroll-aware cream/green, auto-hide, no gold
// ─────────────────────────────────────────────────────────────────────────────
function NavBar() {
  const { role, setRole, isDevMode, setIsDevMode, userEmail, loading } =
    useContext(RoleContext);
  const { getCartCount } = useCart();
  const { isHQ } = useTenant();
  const navigate = useNavigate();

  const isLoggedIn = !!role;
  const cartCount = getCartCount();

  // ★ v3.8: Scroll-aware state — mirrors Landing.js header exactly
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      if (y > 300) {
        setHeaderVisible(y < lastY);
      } else {
        setHeaderVisible(true);
      }
      lastY = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  return (
    <>
      {/* Dev mode banner */}
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
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1001,
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

      {/* ★ v3.8: Main nav — fixed, scroll-aware, auto-hide */}
      <header
        style={{
          position: "fixed",
          top: isDevMode ? "36px" : 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: scrolled
            ? "rgba(27,67,50,0.95)"
            : "rgba(250,249,246,0.97)",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          borderBottom: scrolled
            ? "1px solid rgba(82,183,136,0.15)"
            : "1px solid #e8e0d4",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "56px",
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition:
            "background 0.4s ease, border-color 0.4s ease, transform 0.35s ease, backdrop-filter 0.4s ease",
        }}
      >
        {/* Left: brand + nav links */}
        <nav style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Link
            to="/"
            style={{
              color: scrolled ? "#faf9f6" : "#1b4332",
              textDecoration: "none",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "16px",
              fontWeight: "700",
              letterSpacing: "0.05em",
              marginRight: "16px",
              whiteSpace: "nowrap",
              transition: "color 0.4s ease",
            }}
          >
            Protea Botanicals
          </Link>

          <NavLink to="/" scrolled={scrolled}>
            Home
          </NavLink>
          <NavLink to="/shop" scrolled={scrolled}>
            Shop
          </NavLink>
          {isLoggedIn && (
            <NavLink to="/loyalty" scrolled={scrolled}>
              Loyalty
            </NavLink>
          )}
          {isLoggedIn && (
            <NavLink to="/scan" scrolled={scrolled}>
              Scan QR
            </NavLink>
          )}
          {role === "admin" && (
            <NavLink to="/admin" scrolled={scrolled}>
              Admin
            </NavLink>
          )}
          {role === "retailer" && (
            <NavLink to="/wholesale" scrolled={scrolled}>
              Wholesale
            </NavLink>
          )}
          {isHQ && (
            <NavLink to="/hq" scrolled={scrolled}>
              HQ
            </NavLink>
          )}
        </nav>

        {/* Right: cart + user */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Cart icon */}
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
              stroke={scrolled ? "rgba(255,255,255,0.8)" : "#1a1a1a"}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: "stroke 0.4s ease" }}
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
                      color: scrolled ? "rgba(255,255,255,0.6)" : "#888",
                      fontFamily: "Jost, sans-serif",
                      fontSize: "11px",
                      fontWeight: "400",
                      letterSpacing: "0.02em",
                      maxWidth: "180px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      transition: "color 0.4s ease",
                    }}
                  >
                    {displayEmail}
                  </span>
                )}
              </div>

              <button
                onClick={handleLogout}
                style={{
                  background: scrolled
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(27,67,50,0.06)",
                  border: scrolled
                    ? "1px solid rgba(255,255,255,0.2)"
                    : "1px solid rgba(27,67,50,0.25)",
                  borderRadius: "2px",
                  padding: "6px 14px",
                  fontFamily: "Jost, sans-serif",
                  fontSize: "10px",
                  fontWeight: "600",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: scrolled ? "rgba(255,255,255,0.8)" : "#1b4332",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = scrolled
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(27,67,50,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = scrolled
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(27,67,50,0.06)";
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            /* ★ v3.8: Sign In — matches Landing.js style, no gold */
            <Link
              to="/account"
              style={{
                background: scrolled
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(27,67,50,0.08)",
                border: scrolled
                  ? "1px solid rgba(255,255,255,0.3)"
                  : "1px solid rgba(27,67,50,0.3)",
                borderRadius: "2px",
                padding: "6px 16px",
                fontFamily: "Jost, sans-serif",
                fontSize: "10px",
                fontWeight: "500",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: scrolled ? "#fff" : "#1b4332",
                textDecoration: "none",
                transition:
                  "background 0.2s ease, color 0.4s ease, border-color 0.4s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = scrolled
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(27,67,50,0.14)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = scrolled
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(27,67,50,0.08)";
              }}
            >
              Sign In
            </Link>
          )}
        </div>
      </header>
    </>
  );
}

// ★ v3.8: NavLink now accepts scrolled prop for text color
function NavLink({ to, children, scrolled }) {
  return (
    <Link
      to={to}
      style={{
        color: scrolled ? "rgba(255,255,255,0.8)" : "#1a1a1a",
        textDecoration: "none",
        fontFamily: "Jost, sans-serif",
        fontSize: "11px",
        fontWeight: "600",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        padding: "6px 12px",
        borderRadius: "2px",
        transition: "color 0.3s ease, background 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.target.style.color = scrolled ? "#fff" : "#1b4332";
        e.target.style.background = scrolled
          ? "rgba(255,255,255,0.08)"
          : "rgba(27,67,50,0.06)";
      }}
      onMouseLeave={(e) => {
        e.target.style.color = scrolled ? "rgba(255,255,255,0.8)" : "#1a1a1a";
        e.target.style.background = "transparent";
      }}
    >
      {children}
    </Link>
  );
}

// ★ v3.8: WithNav adds a 56px spacer so content isn't hidden under fixed nav
function WithNav({ children }) {
  return (
    <>
      <NavBar />
      <div style={{ paddingTop: "56px" }}>
        <PageShell>{children}</PageShell>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH GUARDS (unchanged from v3.7)
// ─────────────────────────────────────────────────────────────────────────────
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
    console.log(
      "[RequireAuth] No role, redirecting to /account from:",
      location.pathname,
    );
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
    if (newRole) {
      localStorage.setItem(LS.ROLE, newRole);
    } else {
      localStorage.removeItem(LS.ROLE);
    }
  };

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev)
          console.warn("[App] Safety timeout: forcing loading=false after 5s");
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
        } else {
          setRole(null);
          setUserEmail(null);
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
              {/* ── STANDALONE — no nav ─────────────────────────────── */}
              <Route path="/" element={<Landing />} />

              {/* ★ v3.8: /shop + /verify + /cart get NavBar with 56px spacer */}
              <Route
                path="/shop"
                element={
                  <>
                    <NavBar />
                    <div style={{ paddingTop: "56px" }}>
                      <Shop />
                    </div>
                  </>
                }
              />
              <Route
                path="/verify/:productId"
                element={
                  <>
                    <NavBar />
                    <div style={{ paddingTop: "56px" }}>
                      <ProductVerification />
                    </div>
                  </>
                }
              />
              <Route
                path="/cart"
                element={
                  <>
                    <NavBar />
                    <div style={{ paddingTop: "56px" }}>
                      <CartPage />
                    </div>
                  </>
                }
              />

              {/* Scan routes — standalone, no nav */}
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/scan/:qrCode" element={<ScanResult />} />

              {/* ── WITH nav + auth guard ───────────────────────────── */}
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
                    <div style={{ paddingTop: "56px" }}>
                      <PageShell maxWidth={1200}>
                        <RequireAuth>
                          <RequireRole allowedRoles={["admin"]}>
                            <AdminDashboardRouter />
                          </RequireRole>
                        </RequireAuth>
                      </PageShell>
                    </div>
                  </>
                }
              />
              <Route
                path="/admin/qr"
                element={
                  <>
                    <NavBar />
                    <div style={{ paddingTop: "56px" }}>
                      <PageShell maxWidth={1200}>
                        <RequireAuth>
                          <RequireRole allowedRoles={["admin"]}>
                            <AdminQrGenerator />
                          </RequireRole>
                        </RequireAuth>
                      </PageShell>
                    </div>
                  </>
                }
              />
              <Route
                path="/hq/*"
                element={
                  <>
                    <NavBar />
                    <div style={{ paddingTop: "56px" }}>
                      <PageShell maxWidth={1400}>
                        <RequireAuth>
                          <RequireRole allowedRoles={["admin"]}>
                            <RequireHQ>
                              <HQDashboard />
                            </RequireHQ>
                          </RequireRole>
                        </RequireAuth>
                      </PageShell>
                    </div>
                  </>
                }
              />

              {/* ── WITH nav, no auth required ──────────────────────── */}
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
