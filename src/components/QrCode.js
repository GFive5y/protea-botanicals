// src/components/QrCode.js - FIXED TO REDIRECT TO LIVE SITE
import QRCode from "qrcode.react";

export default function QrCode({ value, size = 128 }) {
  // Change to full live URL so phone camera opens the site
  const fullUrl = `https://protea-botanicals.netlify.app/scan/${value}`;

  return <QRCode value={fullUrl} size={size} level="H" includeMargin={true} />;
}
