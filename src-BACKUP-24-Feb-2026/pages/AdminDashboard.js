// src/pages/AdminDashboard.js
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

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
  }
  .pb-btn:hover { background: #2d6a4f; }
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
  }
  .pb-input:focus { border-color: #2d6a4f; }
  .row-hover { transition: background 0.15s; }
  .row-hover:hover { background: #f4f0e8 !important; }
  .tab-btn { transition: all 0.2s; }
`;

const ADMIN_PASSWORD = "protea-admin-2024";

export default function AdminDashboard({ onAuth }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [scans, setScans] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [newQr, setNewQr] = useState({
    code: "",
    product_name: "",
    points_value: 10,
  });
  const [loading, setLoading] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  const navigate = useNavigate();

  const handlePasswordCheck = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      onAuth?.();
      fetchAll();
    } else {
      setPwError("Incorrect password.");
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: userList }, { data: scanList }, { data: qrList }] =
      await Promise.all([
        supabase
          .from("user_profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("scans")
          .select("*, user_profiles(email), qr_codes(code, products(name))")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("qr_codes")
          .select("*, products(name)")
          .order("created_at", { ascending: false }),
      ]);
    setUsers(userList || []);
    setScans(scanList || []);
    setQrCodes(qrList || []);
    setStats({
      totalUsers: userList?.length || 0,
      totalScans: scanList?.length || 0,
      totalPoints:
        userList?.reduce((s, u) => s + (u.loyalty_points || 0), 0) || 0,
      totalQrs: qrList?.length || 0,
    });
    setLoading(false);
  };

  const handleAddQr = async () => {
    if (!newQr.code || !newQr.product_name) return;
    setAddMsg("");
    let { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("name", newQr.product_name)
      .single();
    if (!product) {
      const { data: p } = await supabase
        .from("products")
        .insert({ name: newQr.product_name })
        .select()
        .single();
      product = p;
    }
    const { error } = await supabase.from("qr_codes").insert({
      code: newQr.code,
      product_id: product.id,
      points_value: newQr.points_value,
    });
    if (error) setAddMsg("Error: " + error.message);
    else {
      setAddMsg("QR code added!");
      setNewQr({ code: "", product_name: "", points_value: 10 });
      fetchAll();
    }
  };

  const TABS = ["overview", "users", "scans", "qr codes"];

  if (!authed)
    return (
      <div
        style={{
          fontFamily: "'Georgia', serif",
          background: "#faf9f6",
          minHeight: "100vh",
        }}
      >
        <style>{sharedStyles}</style>
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
            ⚙️ RESTRICTED ACCESS
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
            Admin Dashboard
          </h1>
        </div>
        <div
          style={{ maxWidth: "440px", margin: "0 auto", padding: "60px 24px" }}
        >
          <div
            style={{
              background: "white",
              border: "1px solid #e8e0d4",
              borderRadius: "2px",
              padding: "48px 40px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                fontSize: "40px",
                textAlign: "center",
                marginBottom: "24px",
              }}
            >
              ⚙️
            </div>
            <h2
              className="shop-font"
              style={{
                fontSize: "26px",
                fontWeight: 400,
                textAlign: "center",
                marginBottom: "8px",
              }}
            >
              Enter Admin Password
            </h2>
            <p
              className="body-font"
              style={{
                fontSize: "13px",
                color: "#aaa",
                textAlign: "center",
                marginBottom: "32px",
              }}
            >
              This area is restricted to authorised personnel.
            </p>
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
              onKeyDown={(e) => e.key === "Enter" && handlePasswordCheck()}
              placeholder="••••••••"
              style={{ marginBottom: "16px" }}
            />
            {pwError && (
              <p
                className="body-font"
                style={{
                  color: "#c0392b",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {pwError}
              </p>
            )}
            <button
              className="pb-btn"
              style={{ width: "100%" }}
              onClick={handlePasswordCheck}
            >
              Access Dashboard
            </button>
          </div>
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
            style={{
              fontSize: "18px",
              color: "#faf9f6",
              letterSpacing: "0.2em",
            }}
          >
            PROTEA
          </span>
          <span
            className="shop-font"
            style={{
              fontSize: "18px",
              color: "#52b788",
              letterSpacing: "0.2em",
            }}
          >
            {" "}
            BOTANICALS
          </span>
        </footer>
      </div>
    );

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: "#faf9f6",
        minHeight: "100vh",
      }}
    >
      <style>{sharedStyles}</style>

      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
          padding: "48px 40px",
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
          ⚙️ ADMIN
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 300,
            color: "#faf9f6",
            margin: "12px 0",
          }}
        >
          Dashboard
        </h1>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: "#f4f0e8",
          borderBottom: "1px solid #e0d8cc",
          padding: "0 40px",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            gap: 0,
            overflowX: "auto",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="body-font tab-btn"
              style={{
                padding: "16px 24px",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab
                    ? "2px solid #1b4332"
                    : "2px solid transparent",
                color: activeTab === tab ? "#1b4332" : "#888",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontWeight: activeTab === tab ? 500 : 300,
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px" }}
      >
        {/* Overview */}
        {activeTab === "overview" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "20px",
                marginBottom: "40px",
              }}
            >
              {[
                ["◉", "Total Users", stats.totalUsers, "#2d6a4f"],
                ["◈", "Total Scans", stats.totalScans, "#2c4a6e"],
                [
                  "❋",
                  "Points Issued",
                  stats.totalPoints?.toLocaleString(),
                  "#b5935a",
                ],
                ["△", "QR Codes", stats.totalQrs, "#1b4332"],
              ].map(([icon, label, value, color]) => (
                <div
                  key={label}
                  style={{
                    background: "white",
                    border: "1px solid #e8e0d4",
                    borderRadius: "2px",
                    padding: "32px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{ fontSize: "32px", color, marginBottom: "12px" }}
                  >
                    {icon}
                  </div>
                  <p
                    className="body-font"
                    style={{
                      fontSize: "11px",
                      color: "#aaa",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                    }}
                  >
                    {label}
                  </p>
                  <p
                    className="shop-font"
                    style={{
                      fontSize: "40px",
                      color: "#1a1a1a",
                      fontWeight: 300,
                      lineHeight: 1,
                    }}
                  >
                    {loading ? "—" : value}
                  </p>
                </div>
              ))}
            </div>

            {/* Add QR Code */}
            <div
              style={{
                background: "white",
                border: "1px solid #e8e0d4",
                borderRadius: "2px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
                  padding: "24px 32px",
                }}
              >
                <h2
                  className="shop-font"
                  style={{ fontSize: "22px", fontWeight: 300, color: "white" }}
                >
                  Add QR Code
                </h2>
              </div>
              <div
                style={{
                  padding: "32px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr auto auto",
                  gap: "16px",
                  alignItems: "end",
                }}
              >
                <div>
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
                    QR Code
                  </label>
                  <input
                    className="pb-input"
                    value={newQr.code}
                    onChange={(e) =>
                      setNewQr((n) => ({ ...n, code: e.target.value }))
                    }
                    placeholder="PROTEA-XXXX"
                  />
                </div>
                <div>
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
                    Product Name
                  </label>
                  <input
                    className="pb-input"
                    value={newQr.product_name}
                    onChange={(e) =>
                      setNewQr((n) => ({ ...n, product_name: e.target.value }))
                    }
                    placeholder="e.g. Premium 1ml Cart"
                  />
                </div>
                <div>
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
                    Points
                  </label>
                  <input
                    className="pb-input"
                    type="number"
                    style={{ width: "80px" }}
                    value={newQr.points_value}
                    onChange={(e) =>
                      setNewQr((n) => ({
                        ...n,
                        points_value: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <button className="pb-btn" onClick={handleAddQr}>
                  Add
                </button>
              </div>
              {addMsg && (
                <p
                  className="body-font"
                  style={{
                    color: "#2d6a4f",
                    fontSize: "13px",
                    padding: "0 32px 24px",
                  }}
                >
                  {addMsg}
                </p>
              )}
            </div>
          </>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div
            style={{
              background: "white",
              border: "1px solid #e8e0d4",
              borderRadius: "2px",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                padding: "24px 32px",
                borderBottom: "1px solid #e8e0d4",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                className="shop-font"
                style={{ fontSize: "24px", fontWeight: 400, color: "#1a1a1a" }}
              >
                Users
              </h2>
              <span
                className="body-font"
                style={{ fontSize: "12px", color: "#aaa" }}
              >
                {users.length} total
              </span>
            </div>
            {users.map((u, i) => (
              <div
                key={u.id}
                className="row-hover"
                style={{
                  padding: "16px 32px",
                  borderBottom:
                    i < users.length - 1 ? "1px solid #f0ebe2" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "white",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <p
                    className="shop-font"
                    style={{ fontSize: "16px", color: "#1a1a1a" }}
                  >
                    {u.email || "—"}
                  </p>
                  <p
                    className="body-font"
                    style={{ fontSize: "11px", color: "#aaa" }}
                  >
                    {u.role || "customer"} · joined{" "}
                    {new Date(u.created_at).toLocaleDateString("en-ZA")}
                  </p>
                </div>
                <span
                  className="body-font"
                  style={{
                    color: "#2d6a4f",
                    fontWeight: 500,
                    fontSize: "14px",
                  }}
                >
                  {u.loyalty_points || 0} pts
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Scans */}
        {activeTab === "scans" && (
          <div
            style={{
              background: "white",
              border: "1px solid #e8e0d4",
              borderRadius: "2px",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                padding: "24px 32px",
                borderBottom: "1px solid #e8e0d4",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                className="shop-font"
                style={{ fontSize: "24px", fontWeight: 400, color: "#1a1a1a" }}
              >
                Recent Scans
              </h2>
              <span
                className="body-font"
                style={{ fontSize: "12px", color: "#aaa" }}
              >
                Last 50
              </span>
            </div>
            {scans.map((s, i) => (
              <div
                key={s.id}
                className="row-hover"
                style={{
                  padding: "16px 32px",
                  borderBottom:
                    i < scans.length - 1 ? "1px solid #f0ebe2" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "white",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <p
                    className="shop-font"
                    style={{ fontSize: "16px", color: "#1a1a1a" }}
                  >
                    {s.qr_codes?.products?.name || "Unknown Product"}
                  </p>
                  <p
                    className="body-font"
                    style={{ fontSize: "11px", color: "#aaa" }}
                  >
                    {s.user_profiles?.email || "—"} ·{" "}
                    {new Date(s.created_at).toLocaleDateString("en-ZA")}
                  </p>
                </div>
                <span
                  className="body-font"
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    letterSpacing: "0.1em",
                  }}
                >
                  {s.qr_codes?.code}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* QR Codes */}
        {activeTab === "qr codes" && (
          <div
            style={{
              background: "white",
              border: "1px solid #e8e0d4",
              borderRadius: "2px",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                padding: "24px 32px",
                borderBottom: "1px solid #e8e0d4",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                className="shop-font"
                style={{ fontSize: "24px", fontWeight: 400, color: "#1a1a1a" }}
              >
                All QR Codes
              </h2>
              <span
                className="body-font"
                style={{ fontSize: "12px", color: "#aaa" }}
              >
                {qrCodes.length} total
              </span>
            </div>
            {qrCodes.map((qr, i) => (
              <div
                key={qr.id}
                className="row-hover"
                style={{
                  padding: "16px 32px",
                  borderBottom:
                    i < qrCodes.length - 1 ? "1px solid #f0ebe2" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "white",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div>
                  <p
                    className="shop-font"
                    style={{ fontSize: "16px", color: "#1a1a1a" }}
                  >
                    {qr.products?.name || "Unknown"}
                  </p>
                  <p
                    className="body-font"
                    style={{
                      fontSize: "11px",
                      color: "#aaa",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {qr.code}
                  </p>
                </div>
                <span
                  className="body-font"
                  style={{
                    color: "#2d6a4f",
                    fontWeight: 500,
                    fontSize: "14px",
                  }}
                >
                  {qr.points_value} pts
                </span>
              </div>
            ))}
          </div>
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
