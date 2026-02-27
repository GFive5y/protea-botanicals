// src/components/QrScanner.js
import { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

export default function QrScanner({ onScanSuccess }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
    }

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 30, // ← increased from 10 to 30
        qrbox: { width: 300, height: 300 }, // ← larger scan area
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true, // ← torch/flash button on mobile
        showZoomSliderIfSupported: true, // ← zoom control on mobile
        defaultZoomValueIfSupported: 2, // ← start slightly zoomed in
        rememberLastUsedCamera: true, // ← remembers preferred camera
        supportedScanTypes: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA, // camera only, no file upload clutter
        ],
        videoConstraints: {
          facingMode: "environment", // ← force rear camera immediately
          width: { ideal: 1280 }, // ← request higher resolution
          height: { ideal: 720 },
        },
      },
      false,
    );

    scannerRef.current = scanner;
    scanner.render(onScanSuccess, () => {});

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [onScanSuccess]);

  return (
    <div style={{ maxWidth: "420px", margin: "20px auto" }}>
      <div id="reader" />
      <p
        style={{
          color: "#aaa",
          fontSize: "0.85rem",
          textAlign: "center",
          marginTop: "12px",
        }}
      >
        Hold the QR code steady inside the box
      </p>
    </div>
  );
}
