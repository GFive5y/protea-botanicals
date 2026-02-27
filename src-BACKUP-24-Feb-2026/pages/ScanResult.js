// src/pages/ScanResult.js
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  }
  .pb-btn-outline:hover { background: #1b4332; color: white; }
`;

export default function ScanResult() {
  const { qrCode } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | success | already | invalid
  const [product, setProduct] = useState(null);
  const [pointsEarned, setPointsEarned] = useState(0);

  useEffect(() => {
    handleScan();
  }, [qrCode]);

  const handleScan = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/account");
      return;
    }

    const { data: qr } = await supabase
      .from("qr_codes")
      .select("*, products(*)")
      .eq("code", qrCode)
      .single();

    if (!qr) {
      setStatus("invalid");
      return;
    }

    const { data: existing } = await supabase
      .from("scans")
      .select("id")
      .eq("qr_code_id", qr.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      setProduct(qr.products);
      setStatus("already");
      return;
    }

    await supabase
      .from("scans")
      .insert({ qr_code_id: qr.id, user_id: user.id });

    const pts = qr.points_value || 10;
    await supabase.rpc("increment_points", { uid: user.id, pts });

    setProduct(qr.products);
    setPointsEarned(pts);
    setStatus("success");
  };

  const stateConfig = {
    loading: {
      icon: "◎",
      title: "Verifying...",
      color: "#888",
      subtitle: "Checking your product against our records.",
    },
    success: {
      icon: "◈",
      title: "Verified!",
      color: "#2d6a4f",
      subtitle: `+${pointsEarned} loyalty points added to your account.`,
    },
    already: {
      icon: "◉",
      title: "Already Scanned",
      color: "#b5935a",
      subtitle: "You've already earned points for this product.",
    },
    invalid: {
      icon: "△",
      title: "Invalid Code",
      color: "#c0392b",
      subtitle: "This QR code was not found in our system.",
    },
  };

  const state = stateConfig[status];

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
          QR VERIFICATION
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
          Scan Result
        </h1>
      </div>

      {/* Result Card */}
      <div
        style={{ maxWidth: "520px", margin: "0 auto", padding: "60px 24px" }}
      >
        <div
          style={{
            background: "white",
            border: "1px solid #e8e0d4",
            borderRadius: "2px",
            padding: "48px 40px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "56px",
              marginBottom: "16px",
              color: state?.color,
            }}
          >
            {state?.icon}
          </div>
          <h2
            className="shop-font"
            style={{
              fontSize: "32px",
              fontWeight: 400,
              color: state?.color,
              marginBottom: "8px",
            }}
          >
            {state?.title}
          </h2>
          <p
            className="body-font"
            style={{
              fontSize: "14px",
              color: "#888",
              fontWeight: 300,
              marginBottom: "32px",
            }}
          >
            {state?.subtitle}
          </p>

          {product && (
            <div
              style={{
                background: "#f4f0e8",
                border: "1px solid #e0d8cc",
                borderRadius: "2px",
                padding: "20px",
                marginBottom: "32px",
                textAlign: "left",
              }}
            >
              <p
                className="body-font"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  color: "#999",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                }}
              >
                Product
              </p>
              <p
                className="shop-font"
                style={{ fontSize: "20px", color: "#1a1a1a", fontWeight: 400 }}
              >
                {product.name}
              </p>
              {product.description && (
                <p
                  className="body-font"
                  style={{
                    fontSize: "13px",
                    color: "#888",
                    fontWeight: 300,
                    marginTop: "4px",
                  }}
                >
                  {product.description}
                </p>
              )}
            </div>
          )}

          {status === "success" && (
            <div
              style={{
                background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
                borderRadius: "2px",
                padding: "20px",
                marginBottom: "32px",
              }}
            >
              <p
                className="body-font"
                style={{
                  color: "#52b788",
                  fontSize: "11px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Points Earned
              </p>
              <p
                className="shop-font"
                style={{ color: "white", fontSize: "48px", fontWeight: 300 }}
              >
                +{pointsEarned}
              </p>
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button className="pb-btn" onClick={() => navigate("/loyalty")}>
              View Points
            </button>
            <button
              className="pb-btn-outline"
              onClick={() => navigate("/scan")}
            >
              Scan Another
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
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
