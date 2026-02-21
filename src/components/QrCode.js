// src/components/QrCode.js - FIXED FOR NETLIFY BUILD
import { QRCodeCanvas as QRCode } from "qrcode.react";

export default function QrCode({ value, size = 128 }) {
  const fullUrl = `https://protea-botanicals.netlify.app/scan/${value}`;

  return <QRCode value={fullUrl} size={size} level="H" includeMargin={true} />;
}
