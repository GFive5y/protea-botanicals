import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./services/supabaseClient";

import Landing from "./pages/Landing";
import ScanPage from "./pages/ScanPage";
import ScanResult from "./pages/ScanResult";
import Loyalty from "./pages/Loyalty";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard"; // ← NEW IMPORT

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  return (
    <Router>
      <div className="App">
        <header
          className="App-header"
          style={{ padding: "20px", background: "#282c34" }}
        >
          <nav
            style={{ display: "flex", gap: "25px", justifyContent: "center" }}
          >
            <Link to="/" style={{ color: "white", textDecoration: "none" }}>
              Home
            </Link>
            <Link
              to="/loyalty"
              style={{ color: "white", textDecoration: "none" }}
            >
              Loyalty
            </Link>
            <Link to="/scan" style={{ color: "white", textDecoration: "none" }}>
              Scan QR
            </Link>
            <Link
              to="/admin"
              style={{ color: "white", textDecoration: "none" }}
            >
              Admin {/* ← NEW ADMIN LINK */}
            </Link>
            {user ? (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                }}
              >
                Log Out
              </button>
            ) : (
              <Link
                to="/auth"
                style={{ color: "white", textDecoration: "none" }}
              >
                Log In
              </Link>
            )}
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/scan/:qrCode" element={<ScanResult />} />
            <Route path="/loyalty" element={<Loyalty />} />
            <Route path="/auth" element={<Login />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
