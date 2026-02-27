// src/App.js — Protea Botanicals v3.5
// ─────────────────────────────────────────────────────────────────────────────
// ★ v3.4 CHANGELOG (Admin QR Generator — 3 changes only):
//   1. ADD: import AdminQrGenerator from "./pages/AdminQrGenerator"
//   2. ADD: /admin/qr route with NavBar + PageShell(1200) + RequireAuth + RequireRole(admin)
//   3. Version bump v3.3 → v3.4
//   NO OTHER CHANGES. All existing routes, auth, NavBar, cart — untouched.
//
// CHANGELOG v3.2.1 → v3.3 (Cart + Checkout):
//   1. ADD: CartProvider wrapping BrowserRouter for global cart state.
//   2. ADD: Cart icon with item count badge in NavBar (between nav links and
//      user identity section). Clicking navigates to /cart.
//   3. ADD: /cart route — CartPage with NavBar, no PageShell (like /shop).
//   4. ADD: /checkout route — CheckoutPage with NavBar + PageShell + RequireAuth.
//   5. ADD: /order-success route — OrderSuccess with NavBar + PageShell.
//   6. ADD: Imports for CartPage, CheckoutPage, OrderSuccess, CartProvider, useCart.
//
//   NO CHANGES to: existing routes, RequireAuth/RequireRole logic, auth state
//   management, console.logs, WithNav, NavLink, any existing imports, dev mode
//   banner, or localStorage keys. All diagnostic patterns preserved.
//
// CHANGELOG v3.2 → v3.2.1 (Spinner freeze fix):
//   1. FIX: RequireAuth now checks `loading && !role` instead of just `loading`.
//      When role exists from localStorage (set by Account.js during login),
//      the spinner is skipped entirely — no waiting for hydrateSession.
//   2. FIX: Dev mode early return in hydrateSession was not calling
//      setLoading(false), causing infinite spinner in dev mode.
//   3. ADD: 5-second safety timeout on loading state — if hydrateSession hangs
//      (e.g. Supabase unreachable, LockManager contention), loading auto-resolves.
//
// CHANGELOG v3.1 → v3.2 (UX & Auth Guards):
//   1. ADD: `loading` state — prevents flash-redirects on page refresh while
//      Supabase session is being hydrated. Always resolves via try/finally.
//   2. ADD: `userEmail` state — displays logged-in user identity in NavBar.
//   3. FIX: hydrateSession now clears stale role if no valid Supabase session
//      exists (prevents ghost auth from old localStorage).
//   4. ADD: NavBar is now auth-aware — shows user email pill + role badge when
//      logged in; shows "Sign In" button when logged out. Admin/Wholesale
//      links remain role-gated (already working in v3.1).
//   5. ADD: RequireAuth wrapper component — redirects unauthenticated users to
//      /account?return=/original-path. Shows branded loading spinner during
//      session hydration. Used on /loyalty, /redeem, /wholesale, /admin.
//   6. ADD: RequireRole wrapper — extends RequireAuth with role check for
//      admin-only and retailer-only routes. Redirects wrong roles to /loyalty.
//
//   NO CHANGES to: route tiers, standalone vs nav structure, page imports,
//   RoleContext shape, dev mode banner, NavLink component, WithNav wrapper,
//   localStorage keys, or any auth flow logic in handleLogout/exitDevMode.
//   All console.log diagnostic patterns preserved.
// ─────────────────────────────────────────────────────────────────────────────
// Main router + RoleContext + inline NavBar
//
// Matches actual project file structure:
//   src/components/  → Auth.js, QrCode.js, QrScanner.js  (NO NavBar.js)
//   src/pages/       → Landing, Login, Loyalty, ScanPage, ScanResult,
//                       AdminDashboard, WholesalePortal, NotFound,
//                       Account, Shop, ProductVerification, Redeem, Welcome,
//                       CartPage, CheckoutPage, OrderSuccess,
//                       AdminQrGenerator  ← ★ v3.4
//
// Route tiers:
//   STANDALONE (no nav):  /  /scan  /scan/:qrCode
//   WITH nav, NO shell:   /shop  /verify/:productId  /cart
//   WITH nav + shell:     /loyalty  /account  /wholesale  /admin  /admin/qr ← ★ v3.4
//                         /redeem  /welcome  /checkout  /order-success
//
// KEY FIX: /scan and /scan/:qrCode are STANDALONE — this removes the admin
// nav bar that was appearing on the scan pages.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useState, useEffect, useContext } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation, // v3.2: needed by RequireAuth for ?return= path
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

// Optional pages — comment out any that don't exist yet to avoid import errors
import Shop from "./pages/Shop";
import ProductVerification from "./pages/ProductVerification";
import Redeem from "./pages/Redeem";
import Welcome from "./pages/Welcome";

// v3.3: Cart + Checkout pages
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccess from "./pages/OrderSuccess";

// ★ v3.4: Admin QR Generator
import AdminQrGenerator from "./pages/AdminQrGenerator";

// ★ v3.5: AI Co-Pilot
import CoPilot from "./components/CoPilot";

// ── Layout shell ──────────────────────────────────────────────────────────────
import PageShell from "./components/PageShell"; // v3.2.1: shared layout wrapper

// ── Cart context ──────────────────────────────────────────────────────────────
import { CartProvider, useCart } from "./contexts/CartContext"; // v3.3

// ── RoleContext ───────────────────────────────────────────────────────────────
export const RoleContext = createContext(null);

const LS = {
  ROLE: "protea_role",
  DEV_MODE: "protea_dev_mode",
};

// ─────────────────────────────────────────────────────────────────────────────
// INLINE NAV BAR — v3.3: Added cart icon with badge count
// Shows user email + role badge when logged in; Sign In when logged out.
// ─────────────────────────────────────────────────────────────────────────────
function NavBar() {
  const { role, setRole, isDevMode, setIsDevMode, userEmail, loading } =
    useContext(RoleContext);
  const { getCartCount } = useCart(); // v3.3
  const navigate = useNavigate();

  const isLoggedIn = !!role;
  const cartCount = getCartCount(); // v3.3

  // v3.1 FIX preserved: properly clear role and localStorage on logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(LS.ROLE);
    localStorage.removeItem(LS.DEV_MODE);
    setRole(null);
    setIsDevMode(false);
    navigate("/"); // v3.2: go to landing, not /account
  };

  const exitDevMode = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(LS.ROLE);
    localStorage.removeItem(LS.DEV_MODE);
    setRole(null);
    setIsDevMode(false);
  };

  // Role display label
  const roleLabel =
    role === "admin" ? "Admin" : role === "retailer" ? "Wholesale" : null;

  // Truncate email for display
  const displayEmail = userEmail
    ? userEmail.length > 24
      ? userEmail.slice(0, 22) + "…"
      : userEmail
    : null;

  return (
    <>
      {/* Dev mode banner — unchanged from v3.1 */}
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

      {/* Main nav — v3.3: cart icon added */}
      <header
        style={{
          background: "#1b4332",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "56px",
        }}
      >
        {/* Left: brand + nav links */}
        <nav style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {/* v3.2: Protea Botanicals brand mark */}
          <Link
            to="/"
            style={{
              color: "#b5935a",
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
        </nav>

        {/* Right: cart icon + user identity or Sign In */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* v3.3: Cart icon with badge */}
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
            {/* Cart SVG icon */}
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
            {/* Badge — only show when cart has items */}
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
              {/* v3.2: User identity cluster */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {/* Role badge — only for admin/retailer */}
                {roleLabel && (
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

                {/* User email */}
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

              {/* Log Out button — same style as v3.1 */}
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
            /* v3.2: Sign In button when not authenticated */
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

// ── Layout wrapper — v3.2.1: now includes PageShell for consistent styling ────
function WithNav({ children }) {
  return (
    <>
      <NavBar />
      <PageShell>{children}</PageShell>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v3.2: AUTH GUARD — RequireAuth
// Redirects unauthenticated users to /account?return=/current-path
// Shows branded loading spinner during session hydration
// ─────────────────────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { role, loading } = useContext(RoleContext);
  const location = useLocation();

  // v3.2.1 FIX: Only show spinner if BOTH loading AND no role from localStorage.
  // When navigating from Account.js (which sets role in localStorage before redirect),
  // role is immediately available via useState init — no need to wait for hydrateSession.
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

  // Not authenticated — redirect to login with return path
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

// ─────────────────────────────────────────────────────────────────────────────
// v3.2: ROLE GUARD — RequireRole
// Extends RequireAuth: also checks user has correct role.
// Wrong role → redirected to /loyalty (safe default for authenticated users).
// ─────────────────────────────────────────────────────────────────────────────
function RequireRole({ allowedRoles, children }) {
  const { role } = useContext(RoleContext);

  // RequireAuth already handles null role, so role is guaranteed here
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

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT — v3.3: CartProvider wraps everything
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // v3.1 preserved: role + devMode state
  const [role, setRoleState] = useState(
    () => localStorage.getItem(LS.ROLE) || null,
  );
  const [isDevMode, setIsDevMode] = useState(
    () => localStorage.getItem(LS.DEV_MODE) === "true",
  );

  // v3.2: new state for auth-aware UI
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);

  // v3.1 preserved: setRole removes from localStorage when null
  const setRole = (newRole) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem(LS.ROLE, newRole);
    } else {
      localStorage.removeItem(LS.ROLE);
    }
  };

  useEffect(() => {
    // v3.2.1: Safety timeout — if loading hasn't resolved in 5s, force it
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev)
          console.warn("[App] Safety timeout: forcing loading=false after 5s");
        return false;
      });
    }, 5000);

    // v3.2: Hydrate role + email from existing Supabase session on refresh
    const hydrateSession = async () => {
      try {
        if (localStorage.getItem(LS.DEV_MODE) === "true") {
          setLoading(false); // v3.2.1 FIX: was missing — caused infinite spinner in dev mode
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
          setUserEmail(session.user.email); // v3.2
          console.log(
            "[App] Session hydrated:",
            session.user.email,
            "role:",
            profile?.role,
          );
        } else {
          // v3.2: No valid session — clear any stale role from localStorage
          setRole(null);
          setUserEmail(null);
          console.log("[App] No session found, cleared stale role");
        }
      } catch (err) {
        console.error("[App] hydrateSession error:", err);
      } finally {
        setLoading(false); // v3.2: ALWAYS resolve loading
        clearTimeout(safetyTimer); // v3.2.1: cancel safety timer if resolved normally
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
        setUserEmail(session.user.email); // v3.2
      } else if (event === "SIGNED_OUT") {
        if (localStorage.getItem(LS.DEV_MODE) !== "true") {
          setRoleState(null);
          localStorage.removeItem(LS.ROLE);
          setUserEmail(null); // v3.2
        }
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        if (localStorage.getItem(LS.DEV_MODE) !== "true") {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (profile?.role) setRole(profile.role);
          setUserEmail(session.user.email); // v3.2
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer); // v3.2.1: cleanup safety timer
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
        loading, // v3.2
        userEmail, // v3.2
      }}
    >
      {/* v3.3: CartProvider wraps BrowserRouter so NavBar can access cart count */}
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* ── STANDALONE — no nav ─────────────────────────────────────── */}
            <Route path="/" element={<Landing />} />
            {/* v3.4: /shop gets NavBar but no PageShell (has full-bleed hero) */}
            <Route
              path="/shop"
              element={
                <>
                  <NavBar />
                  <Shop />
                </>
              }
            />
            {/* v3.4: /verify gets NavBar but no PageShell (dark full-bleed theme) */}
            <Route
              path="/verify/:productId"
              element={
                <>
                  <NavBar />
                  <ProductVerification />
                </>
              }
            />

            {/* v3.3: /cart gets NavBar but no PageShell (like /shop — full-bleed) */}
            <Route
              path="/cart"
              element={
                <>
                  <NavBar />
                  <CartPage />
                </>
              }
            />

            {/* ✅ FIXED in v3: scan routes standalone — no admin nav */}
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/scan/:qrCode" element={<ScanResult />} />

            {/* ── WITH nav + auth guard ───────────────────────────────────── */}
            {/* v3.2: /loyalty and /redeem require authentication */}
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

            {/* v3.3: /checkout requires auth (must be logged in to pay) */}
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

            {/* v3.3: /order-success — post-payment confirmation */}
            <Route
              path="/order-success"
              element={
                <WithNav>
                  <OrderSuccess />
                </WithNav>
              }
            />

            {/* v3.2: /wholesale requires auth + retailer role */}
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

            {/* v3.2: /admin requires auth + admin role */}
            {/* v3.4: /admin gets wider layout (1200px) for tables */}
            <Route
              path="/admin"
              element={
                <>
                  <NavBar />
                  <PageShell maxWidth={1200}>
                    <RequireAuth>
                      <RequireRole allowedRoles={["admin"]}>
                        <AdminDashboard />
                      </RequireRole>
                    </RequireAuth>
                  </PageShell>
                </>
              }
            />

            {/* ★ v3.4: /admin/qr — Admin QR Code Generator */}
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
      </CartProvider>
    </RoleContext.Provider>
  );
}
