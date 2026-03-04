// src/App.js — Protea Botanicals v3.9
// ─────────────────────────────────────────────────────────────────────────────
// ★ v3.9 CHANGELOG:
//   1. FIX: NavBar brand "Protea Botanicals" colour #b5935a → #faf9f6 (cream)
//      Matches Landing.js header treatment. No more gold logo.
//   2. ADD: NavBar scroll-hide behaviour — identical to Landing.js v5.7.
//      Header slides up (translateY -100%) when user scrolls down past 80px,
//      reappears when user scrolls up. Uses position:sticky + CSS transition.
//      State: headerVisible (bool), scrolled (bool).
//      Effect: passive scroll listener using lastYRef.
//   NO OTHER CHANGES. All routes, auth, cart, roles — untouched.
//
// ★ v3.8 CHANGELOG:
//   1. ADD: /terpenes/:id route — individual terpene detail page.
//   NO OTHER CHANGES.
//
// ★ v3.7 CHANGELOG (Phase 2F — Shop Admin Scoping):
//   1. ADD: AdminDashboardRouter
//   NO OTHER CHANGES.
//
// ★ v3.6 CHANGELOG (Phase 2A — Multi-Tenant Foundation):
//   1. ADD: TenantProvider, RequireHQ, /hq route, HQ NavLink
//   NO OTHER CHANGES.
//
// ★ v3.5 CHANGELOG: AI Co-Pilot sidebar
// ★ v3.4 CHANGELOG: Admin QR Generator
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

// ── Layout shell ─────────────────────────────────────────────────────────────
import PageShell from "./components/PageShell";

// ── Cart context ─────────────────────────────────────────────────────────────
import { CartProvider, useCart } from "./contexts/CartContext";

// ★ v3.6: Tenant context
import { TenantProvider, useTenant } from "./services/tenantService";

// ── RoleContext ───────────────────────────────────────────────────────────────
export const RoleContext = createContext(null);

const LS = {
  ROLE: "protea_role",
  DEV_MODE: "protea_dev_mode",
};

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR
// v3.9: cream brand text + scroll-hide (translateY) behaviour
// ─────────────────────────────────────────────────────────────────────────────
function NavBar() {
  const { role, setRole, isDevMode, setIsDevMode, userEmail } =
    useContext(RoleContext);
  const { getCartCount } = useCart();
  const { isHQ } = useTenant();
  const navigate = useNavigate();

  const isLoggedIn = !!role;
  const cartCount = getCartCount();

  // ── v3.9: scroll-hide ──────────────────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastYRef = useRef(0);

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
  // ──────────────────────────────────────────────────────────────────────────

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

      {/* ★ v3.9: sticky position + scroll-hide transform */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          background: scrolled ? "rgba(27,67,50,0.97)" : "#1b4332",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          padding: "0 24px",
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
        <nav style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {/* ★ v3.9: #faf9f6 cream — was #b5935a gold */}
          <Link
            to="/"
            style={{
              color: "#faf9f6",
              textDecoration: "none",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "16px",
              fontWeight: "700",
              letterSpacing: "0.05em",
              marginRight: "16px",
              whiteSpace: "nowrap",
            }}
          >
            Protea Botanicals
          </Link>

          <NavLink to="/">Home</NavLink>
          <NavLink to="/shop">Shop</NavLink>
          {isLoggedIn && <NavLink to="/loyalty">Loyalty</NavLink>}
          {isLoggedIn && <NavLink to="/scan">Scan QR</NavLink>}
          {role === "admin" && <NavLink to="/admin">Admin</NavLink>}
          {role === "retailer" && <NavLink to="/wholesale">Wholesale</NavLink>}
          {isHQ && <NavLink to="/hq">HQ</NavLink>}
        </nav>

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
              stroke="rgba(255,255,255,0.8)"
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
                      color: "rgba(255,255,255,0.6)",
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
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "2px",
                  padding: "6px 14px",
                  fontFamily: "Jost, sans-serif",
                  fontSize: "10px",
                  fontWeight: "600",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.8)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.15)";
                  e.target.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.08)";
                  e.target.style.color = "rgba(255,255,255,0.8)";
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <Link
              to="/account"
              style={{
                background: "#b5935a",
                border: "none",
                borderRadius: "2px",
                padding: "7px 18px",
                fontFamily: "Jost, sans-serif",
                fontSize: "10px",
                fontWeight: "600",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#fff",
                textDecoration: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#a07e45")}
              onMouseLeave={(e) => (e.target.style.background = "#b5935a")}
            >
              Sign In
            </Link>
          )}
        </div>
      </header>
    </>
  );
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        color: "rgba(255,255,255,0.8)",
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
        e.target.style.color = "#fff";
        e.target.style.background = "rgba(255,255,255,0.08)";
      }}
      onMouseLeave={(e) => {
        e.target.style.color = "rgba(255,255,255,0.8)";
        e.target.style.background = "transparent";
      }}
    >
      {children}
    </Link>
  );
}

function WithNav({ children }) {
  return (
    <>
      <NavBar />
      <PageShell>{children}</PageShell>
    </>
  );
}

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
    console.log(
      "[RequireRole] Role",
      role,
      "not in",
      allowedRoles,
      "→ redirecting to /loyalty",
    );
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
    console.log("[RequireHQ] No HQ access → redirecting to", fallback);
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

  if (isHQ) {
    console.log("[AdminDashboardRouter] HQ user → AdminDashboard");
    return <AdminDashboard />;
  }

  if (tenantType === "shop") {
    console.log("[AdminDashboardRouter] Shop admin → ShopDashboard");
    return <ShopDashboard />;
  }

  console.log("[AdminDashboardRouter] Fallback → AdminDashboard");
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
          console.log(
            "[App] Session hydrated:",
            session.user.email,
            "role:",
            profile?.role,
          );
        } else {
          setRole(null);
          setUserEmail(null);
          console.log("[App] No session found, cleared stale role");
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
      value={{
        role,
        setRole,
        isDevMode,
        setIsDevMode,
        loading,
        userEmail,
      }}
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

              {/* ── SCAN — standalone, no nav ───────────────────────────────── */}
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/scan/:qrCode" element={<ScanResult />} />

              {/* ── MOLECULES ───────────────────────────────────────────────── */}
              <Route
                path="/molecules"
                element={
                  <WithNav>
                    <MoleculesPage />
                  </WithNav>
                }
              />

              {/* ── TERPENES ─────────────────────────────────────────────────
                   /terpenes      → full carousel browse page
                   /terpenes/:id  → carousel page with specific terpene modal
                                    auto-opened (TerpenePage reads useParams)
              ─────────────────────────────────────────────────────────────── */}
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

              {/* ── WITH nav, NO auth required ──────────────────────────────── */}
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
