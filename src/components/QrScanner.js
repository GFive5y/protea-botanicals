// src/components/QrScanner.js - STABLE AUTO-START VERSION (Super Grok v4.2)
import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function QrScanner({ onScanSuccess }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false,
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        onScanSuccess(decodedText);
        scanner.clear().catch(() => {});
      },
      (error) => {
        // Ignore common "no QR found" errors
        if (!error.startsWith("QR code parse error")) {
          console.warn(error);
        }
      },
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [onScanSuccess]);

  return <div id="reader" style={{ maxWidth: "400px", margin: "30px auto" }} />;
}
