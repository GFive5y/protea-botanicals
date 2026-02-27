// src/components/QrCode.js
import { QRCodeSVG } from "qrcode.react";

export default function QrCode({ value, size = 256 }) {
  return (
    <div
      style={{
        padding: "20px",
        background: "white",
        display: "inline-block",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      <QRCodeSVG value={value} size={size} level="H" includeMargin={true} />
      <p
        style={{
          textAlign: "center",
          marginTop: "10px",
          fontSize: "14px",
          color: "#000",
        }}
      >
        {value}
      </p>
    </div>
  );
}
