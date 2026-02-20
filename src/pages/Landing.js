// src/pages/Landing.js
import QrCode from "../components/QrCode";

export default function Landing() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h1>Welcome to Protea Botanicals</h1>
      <p style={{ fontSize: "1.3rem", maxWidth: "600px", margin: "20px auto" }}>
        Scan any product QR code to verify authenticity, view lab results, and
        earn loyalty points.
      </p>

      <div style={{ margin: "40px 0" }}>
        <QrCode value="PB-001-2026-0001" size={220} />
      </div>

      <a
        href="/scan"
        style={{
          display: "inline-block",
          padding: "16px 32px",
          background: "#61dafb",
          color: "#000",
          fontSize: "1.2rem",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        📱 Start Scanning
      </a>
    </div>
  );
}
