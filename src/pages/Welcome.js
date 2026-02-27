// src/pages/Welcome.js
import { useNavigate } from "react-router-dom";

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500&display=swap');
  .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font { font-family: 'Jost', sans-serif; }
  .pb-btn {
    font-family: 'Jost', sans-serif;
    padding: 14px 40px;
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
    padding: 14px 40px;
    background: transparent;
    color: white;
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  }
  .pb-btn-outline:hover { background: rgba(255,255,255,0.1); }
  .step-card { transition: transform 0.2s; }
  .step-card:hover { transform: translateY(-4px); }
`;

const STEPS = [
  {
    icon: "◈",
    title: "Scan Your Product",
    desc: "Find the QR code on your product packaging and scan it with our app.",
  },
  {
    icon: "❋",
    title: "Earn Points",
    desc: "Every verified scan adds loyalty points directly to your account.",
  },
  {
    icon: "◉",
    title: "Unlock Rewards",
    desc: "Redeem your points for discounts, free products, and exclusive offers.",
  },
];

export default function Welcome() {
  const navigate = useNavigate();

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
          padding: "100px 40px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "32px" }}>🌿</span>
        <span
          className="body-font"
          style={{
            display: "block",
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#52b788",
            margin: "16px 0 8px",
          }}
        >
          WELCOME TO
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(40px, 8vw, 80px)",
            fontWeight: 300,
            color: "#faf9f6",
            margin: "0 0 16px",
            letterSpacing: "0.05em",
          }}
        >
          Protea Botanicals
        </h1>
        <p
          className="body-font"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "16px",
            fontWeight: 300,
            maxWidth: "480px",
            margin: "0 auto 40px",
          }}
        >
          Premium botanical extracts, lab certified and QR verified. Earn
          rewards every time you purchase.
        </p>
        <div
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button className="pb-btn" onClick={() => navigate("/account")}>
            Create Account
          </button>
          <button className="pb-btn-outline" onClick={() => navigate("/scan")}>
            Scan a Product
          </button>
        </div>
      </div>

      {/* How It Works */}
      <div
        style={{ maxWidth: "900px", margin: "0 auto", padding: "80px 24px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <span
            className="body-font"
            style={{
              fontSize: "11px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#52b788",
            }}
          >
            THE PROCESS
          </span>
          <h2
            className="shop-font"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 300,
              color: "#1a1a1a",
              margin: "12px 0",
            }}
          >
            How It Works
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "24px",
          }}
        >
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="step-card"
              style={{
                background: "white",
                border: "1px solid #e8e0d4",
                borderRadius: "2px",
                padding: "40px 32px",
                textAlign: "center",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
                  borderRadius: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  fontSize: "24px",
                  color: "#52b788",
                }}
              >
                {step.icon}
              </div>
              <div
                className="body-font"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.25em",
                  color: "#b5935a",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Step {i + 1}
              </div>
              <h3
                className="shop-font"
                style={{
                  fontSize: "22px",
                  fontWeight: 400,
                  color: "#1a1a1a",
                  marginBottom: "12px",
                }}
              >
                {step.title}
              </h3>
              <p
                className="body-font"
                style={{
                  fontSize: "13px",
                  color: "#888",
                  fontWeight: 300,
                  lineHeight: 1.7,
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "56px" }}>
          <button className="pb-btn" onClick={() => navigate("/account")}>
            Get Started
          </button>
        </div>
      </div>

      {/* Feature Strip */}
      <div
        style={{
          background: "#f4f0e8",
          borderTop: "1px solid #e0d8cc",
          borderBottom: "1px solid #e0d8cc",
          padding: "48px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "32px",
            textAlign: "center",
          }}
        >
          {[
            ["◇", "Lab Certified", "COA on every batch"],
            ["△", "CO₂ Extracted", "Cleanest method available"],
            ["○", "QR Verified", "Scan to confirm authenticity"],
            ["❋", "Rewards", "Earn on every purchase"],
          ].map(([icon, title, desc]) => (
            <div key={title}>
              <div
                style={{
                  fontSize: "24px",
                  color: "#2d6a4f",
                  marginBottom: "8px",
                }}
              >
                {icon}
              </div>
              <p
                className="shop-font"
                style={{
                  fontSize: "18px",
                  color: "#1a1a1a",
                  marginBottom: "4px",
                }}
              >
                {title}
              </p>
              <p
                className="body-font"
                style={{ fontSize: "12px", color: "#aaa", fontWeight: 300 }}
              >
                {desc}
              </p>
            </div>
          ))}
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
