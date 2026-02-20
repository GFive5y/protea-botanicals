import { QRCodeSVG } from "qrcode.react";

export default function QrCode({ value, size = 256 }) {
  return (
    <div
      style={{
        padding: "20px",
        background: "white",
        display: "inline-block",
        borderRadius: "8px",
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
