// src/components/QrScanner.js - MOBILE-FRIENDLY VERSION (Super Grok v5.2)
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
      },
      (error) => {
        if (!error.startsWith("QR code parse error")) {
          console.warn(error);
        }
      },
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [onScanSuccess]);

  return <div id="reader" style={{ maxWidth: "400px", margin: "30px auto" }} />;
}
