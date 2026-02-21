// src/pages/ScanPage.js - FIXED TO EXTRACT BATCH NUMBER FROM FULL URL
import { useState } from "react";
import QrScanner from "../components/QrScanner";
import { authenticateQR } from "../services/scanService";

export default function ScanPage() {
  const [result, setResult] = useState(null);

  const handleScanSuccess = async (scannedValue) => {
    // Extract batch number from full URL if present
    let batchNumber = scannedValue;

    if (scannedValue.includes("protea-botanicals.netlify.app/scan/")) {
      batchNumber = scannedValue.split("/scan/").pop();
    }

    const authResult = await authenticateQR(batchNumber);
    setResult(authResult);
  };

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h1>Scan Product QR Code</h1>
      <p>Point your camera at the QR code on the product</p>

      {!result ? (
        <QrScanner onScanSuccess={handleScanSuccess} />
      ) : (
        <div style={{ maxWidth: "700px", margin: "40px auto" }}>
          {result.authentic ? (
            <div
              style={{
                background: "#d4edda",
                padding: "30px",
                borderRadius: "12px",
              }}
            >
              <h2 style={{ color: "green" }}>✅ Authentic Product</h2>
              <p>
                <strong>Batch:</strong>{" "}
                {result.batch?.batch_number || "Unknown"}
              </p>
              <p>
                <strong>Product:</strong>{" "}
                {result.batch?.product_name || "Unknown"}
              </p>
              <p>
                <strong>THC Content:</strong> {result.batch?.thc_content || 0}%
              </p>
              <p>
                <strong>CBD Content:</strong> {result.batch?.cbd_content || 0}%
              </p>
              <p>
                <strong>Organic:</strong> {result.batch?.organic ? "Yes" : "No"}
              </p>
              <p>
                <strong>Production Date:</strong>{" "}
                {result.batch?.production_date || "N/A"}
              </p>
              <p>
                <strong>Expiry Date:</strong>{" "}
                {result.batch?.expiry_date || "N/A"}
              </p>
              <p>
                <strong>Points Earned:</strong>{" "}
                <strong>{result.pointsEarned || 0}</strong>
              </p>

              <div style={{ marginTop: "30px", textAlign: "center" }}>
                <a
                  href={result.batch?.coa_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "16px 40px",
                    background: "#61dafb",
                    color: "#000",
                    fontSize: "1.2rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: "bold",
                  }}
                >
                  📄 View Full COA (PDF)
                </a>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#f8d7da",
                padding: "30px",
                borderRadius: "12px",
                color: "red",
              }}
            >
              <h2>⚠️ {result.message}</h2>
            </div>
          )}
          <button onClick={() => setResult(null)} style={{ marginTop: "20px" }}>
            Scan Another Code
          </button>
        </div>
      )}
    </div>
  );
}
