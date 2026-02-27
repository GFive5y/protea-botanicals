// src/App.js
// ─────────────────────────────────────────────────────────────────────────────
// Main router + RoleContext + inline NavBar
//
// Matches actual project file structure:
//   src/components/  → Auth.js, QrCode.js, QrScanner.js  (NO NavBar.js)
//   src/pages/       → Landing, Login, Loyalty, ScanPage, ScanResult,
//                       AdminDashboard, WholesalePortal, NotFound,
//                       Account, Shop, ProductVerification, Redeem, Welcome
//
// Route tiers:
//   STANDALONE (no nav):  /  /shop  /scan  /scan/:qrCode  /verify/:productId
//   WITH inline nav:      /loyalty  /account  /wholesale  /admin  /redeem  /welcome
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

// ── RoleContext ───────────────────────────────────────────────────────────────
export const RoleContext = createContext();

const LS = {
  ROLE: "protea_role",
  DEV_MODE: "protea_dev_mode",
};

// ─────────────────────────────────────────────────────────────────────────────
// INLINE NAV BAR
// Replaces the old inline header in App.js — same dark bar, role-aware links
// ─────────────────────────────────────────────────────────────────────────────
function NavBar() {
  const { role, setRole, isDevMode, setIsDevMode } = useContext(RoleContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRole("customer");
    setIsDevMode(false);
    localStorage.removeItem(LS.DEV_MODE);
    navigate("/account");
  };

  const exitDevMode = async () => {
    await supabase.auth.signOut();
    setRole("customer");
    setIsDevMode(false);
    localStorage.removeItem(LS.DEV_MODE);
  };

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

      {/* Main nav */}
      <header
        style={{
          background: "#1b4332",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "52px",
        }}
      >
        <nav style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/loyalty">Loyalty</NavLink>
          <NavLink to="/scan">Scan QR</NavLink>
          {role === "admin" && <NavLink to="/admin">Admin</NavLink>}
          {role === "retailer" && <NavLink to="/wholesale">Wholesale</NavLink>}
        </nav>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "2px",
              padding: "6px 14px",
              fontFamily: "Jost, sans-serif",
              fontSize: "10px",
              fontWeight: "600",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Log Out
          </button>
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

// ── Layout wrapper ────────────────────────────────────────────────────────────
function WithNav({ children }) {
  return (
    <>
      <NavBar />
      <main>{children}</main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRoleState] = useState(
    () => localStorage.getItem(LS.ROLE) || "customer",
  );
  const [isDevMode, setIsDevMode] = useState(
    () => localStorage.getItem(LS.DEV_MODE) === "true",
  );

  const setRole = (newRole) => {
    setRoleState(newRole);
    localStorage.setItem(LS.ROLE, newRole);
  };

  useEffect(() => {
    // Hydrate role from existing Supabase session on refresh
    const hydrateSession = async () => {
      if (localStorage.getItem(LS.DEV_MODE) === "true") return;
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
      } else if (event === "SIGNED_OUT") {
        if (localStorage.getItem(LS.DEV_MODE) !== "true") {
          setRoleState("customer");
          localStorage.removeItem(LS.ROLE);
        }
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        if (localStorage.getItem(LS.DEV_MODE) !== "true") {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          if (profile?.role) setRole(profile.role);
        }
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole, isDevMode, setIsDevMode }}>
      <BrowserRouter>
        <Routes>
          {/* ── STANDALONE — no nav ─────────────────────────────────────── */}
          <Route path="/" element={<Landing />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/verify/:productId" element={<ProductVerification />} />

          {/* ✅ FIXED: scan routes standalone — no admin nav */}
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/scan/:qrCode" element={<ScanResult />} />

          {/* ── WITH nav ────────────────────────────────────────────────── */}
          <Route
            path="/loyalty"
            element={
              <WithNav>
                <Loyalty />
              </WithNav>
            }
          />
          <Route
            path="/account"
            element={
              <WithNav>
                <Account />
              </WithNav>
            }
          />
          <Route
            path="/redeem"
            element={
              <WithNav>
                <Redeem />
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
          <Route
            path="/wholesale"
            element={
              <WithNav>
                <WholesalePortal />
              </WithNav>
            }
          />
          <Route
            path="/admin"
            element={
              <WithNav>
                <AdminDashboard />
              </WithNav>
            }
          />

          {/* Fallback */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </RoleContext.Provider>
  );
}
