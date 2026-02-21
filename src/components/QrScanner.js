// src/components/QrScanner.js - MOBILE-FRIENDLY MANUAL START (Super Grok v5.2)
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrScanner({ onScanSuccess }) {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");

  const startScanner = async () => {
    if (scannerRef.current) return;

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" }, // back camera
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScanSuccess(decodedText);
          stopScanner();
        },
        () => {}, // ignore "no QR found" errors
      );
      setIsScanning(true);
      setError("");
    } catch (err) {
      setError(
        "Could not start camera. Please allow camera permission and try again.",
      );
      console.error(err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {}
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  return (
    <div
      style={{ maxWidth: "400px", margin: "30px auto", textAlign: "center" }}
    >
      <div id="reader" style={{ display: isScanning ? "block" : "none" }} />

      {!isScanning ? (
        <button
          onClick={startScanner}
          style={{
            padding: "16px 32px",
            background: "#61dafb",
            color: "#000",
            fontSize: "1.2rem",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          Start Scanning
        </button>
      ) : (
        <button onClick={stopScanner} style={{ marginTop: "10px" }}>
          Stop Scanner
        </button>
      )}

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}
