// src/App.js
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "./services/supabaseClient";
import Landing from "./pages/Landing";
import Shop from "./pages/Shop";
import ScanPage from "./pages/ScanPage";
import ScanResult from "./pages/ScanResult";
import Loyalty from "./pages/Loyalty";
import Account from "./pages/Account";
import Welcome from "./pages/Welcome";
import AdminDashboard from "./pages/AdminDashboard";
import Redeem from "./pages/Redeem";
import WholesalePortal from "./pages/WholesalePortal";
import ProductVerification from "./pages/ProductVerification";

// ── Role Context ──────────────────────────────────────────────
export const RoleContext = createContext({ role: null, accent: "#61dafb" });
export const useRole = () => useContext(RoleContext);

const ROLE_CONFIG = {
  customer: {
    accent: "#61dafb",
    badge: null,
    label: "Customer",
  },
  retailer: {
    accent: "#2ecc71",
    badge: "🏪 Wholesale",
    label: "Retailer",
  },
  admin: {
    accent: "#ffd700",
    badge: "⚙️ Admin",
    label: "Admin",
  },
};

// ── NavBar ────────────────────────────────────────────────────
function NavBar({ role }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.customer;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
    window.location.reload();
  };

  const linkStyle = {
    color: "white",
    textDecoration: "none",
    fontSize: "0.95rem",
  };

  return (
    <header
      style={{
        padding: "16px 20px",
        background: "#282c34",
        borderBottom: `3px solid ${config.accent}`,
      }}
    >
      <nav
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Role Badge */}
        {config.badge && (
          <span
            style={{
              padding: "4px 12px",
              background: config.accent,
              color: "#000",
              borderRadius: "20px",
              fontSize: "0.8rem",
              fontWeight: "bold",
            }}
          >
            {config.badge}
          </span>
        )}

        {/* Home — everyone */}
        <Link to="/" style={linkStyle}>
          Home
        </Link>

        {/* Scan QR — everyone */}
        <Link to="/scan" style={linkStyle}>
          Scan QR
        </Link>

        {/* Customer only */}
        {role === "customer" && (
          <>
            <Link to="/loyalty" style={linkStyle}>
              Loyalty
            </Link>
            <Link to="/redeem" style={linkStyle}>
              Redeem
            </Link>
          </>
        )}

        {/* Retailer only */}
        {role === "retailer" && (
          <Link
            to="/wholesale"
            style={{ ...linkStyle, color: config.accent, fontWeight: "bold" }}
          >
            Wholesale Portal
          </Link>
        )}

        {/* Admin only */}
        {role === "admin" && (
          <Link
            to="/admin"
            style={{ ...linkStyle, color: config.accent, fontWeight: "bold" }}
          >
            Dashboard
          </Link>
        )}

        {/* Account — everyone */}
        <Link to="/account" style={linkStyle}>
          Account
        </Link>

        {/* Logged in indicator + logout */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: config.accent, fontSize: "0.8rem" }}>
              ● {config.label}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 14px",
                background: config.accent,
                color: "#000",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.85rem",
              }}
            >
              Log Out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}

// ── App ───────────────────────────────────────────────────────
function App() {
  const [role, setRole] = useState("customer");
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    detectRole();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      detectRole();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const detectRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRole("customer");
      setRoleLoaded(true);
      return;
    }
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setRole(profile?.role || "customer");
    setRoleLoaded(true);
  };

  const handleAdminAuth = () => setRole("admin");

  if (!roleLoaded) return null;

  return (
    <RoleContext.Provider
      value={{ role, accent: ROLE_CONFIG[role]?.accent || "#61dafb" }}
    >
      <Router>
        <div className="App">
          <Routes>
            {/* Landing — NO shared nav, has its own design */}
            <Route path="/" element={<Landing />} />

            {/* Shop — has its own nav */}
            <Route path="/shop" element={<Shop />} />

            {/* All other routes — shared NavBar */}
            <Route
              path="/*"
              element={
                <>
                  <NavBar role={role} />
                  <main>
                    <Routes>
                      <Route path="/scan" element={<ScanPage />} />
                      <Route path="/scan/:qrCode" element={<ScanResult />} />
                      <Route path="/loyalty" element={<Loyalty />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/welcome" element={<Welcome />} />
                      <Route
                        path="/admin"
                        element={<AdminDashboard onAuth={handleAdminAuth} />}
                      />
                      <Route path="/redeem" element={<Redeem />} />
                      <Route path="/wholesale" element={<WholesalePortal />} />
                      <Route
                        path="/verify/:productId"
                        element={<ProductVerification />}
                      />
                    </Routes>
                  </main>
                </>
              }
            />
          </Routes>
        </div>
      </Router>
    </RoleContext.Provider>
  );
}

export default App;
