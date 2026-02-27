// src/pages/AdminQrGenerator.js
// v1.0 — February 27, 2026
// Admin QR Code Generator — 4 types: Standard, Promo, Product, Custom
// Accessible at /admin/qr (requires admin role)
// Uses inline styles + tokens.js design system (NO Tailwind)
// Uses QRCodeSVG from qrcode.react (same lib as QrCode.js)

import React, { useState, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

// Design tokens (matching tokens.js C object)
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  cream: "#faf9f6",
  footer: "#1a1a1a",
  border: "#e0dbd2",
  muted: "#888888",
  text: "#1a1a1a",
};

const QR_TYPES = [
  {
    value: "standard",
    label: "Standard Product QR",
    desc: "Inner packaging → /scan/:code for loyalty points",
  },
  {
    value: "promo",
    label: "Promo Campaign QR",
    desc: "Marketing → landing with ?promo= parameter",
  },
  {
    value: "product",
    label: "Product Verification QR",
    desc: "Outer packaging → /verify/:strainId (public COA)",
  },
  {
    value: "custom",
    label: "Custom URL QR",
    desc: "Any URL — flyers, social, business cards",
  },
];

const STRAINS = [
  "pineapple-express",
  "wedding-cake",
  "gelato-41",
  "peaches-and-cream",
  "purple-punch",
  "mimosa",
  "cinnamon-kush-cake",
  "rntz",
  "blue-zushi",
  "mac",
  "sweet-watermelon",
  "pear-jam",
  "melon-lychee",
  "tutti-frutti",
  "zkz",
  "purple-crack",
  "lemonhead-plus",
  "sherblato-plus",
];

const SOURCES = [
  "packaging",
  "flyer",
  "social",
  "website",
  "event",
  "wholesale",
];

export default function AdminQrGenerator() {
  const [qrType, setQrType] = useState("standard");
  const [domain, setDomain] = useState("http://localhost:3000");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  // Type-specific state
  const [productCode, setProductCode] = useState("0006");
  const [source, setSource] = useState("packaging");
  const [promoCode, setPromoCode] = useState("preregister-1000");
  const [strain, setStrain] = useState("pineapple-express");
  const [customUrl, setCustomUrl] = useState("");

  const generateUrl = useCallback(() => {
    let url = "";
    switch (qrType) {
      case "standard":
        url = `${domain}/scan/PB-001-2026-${productCode.padStart(4, "0")}?source=${source}`;
        break;
      case "promo":
        url = `${domain}/?promo=${promoCode}&source=promo`;
        break;
      case "product":
        url = `${domain}/verify/${strain}?source=${source}`;
        break;
      case "custom":
        url = customUrl || domain;
        break;
      default:
        url = domain;
    }
    setGeneratedUrl(url);
    setCopied(false);
  }, [qrType, domain, productCode, source, promoCode, strain, customUrl]);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(generatedUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = generatedUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  const downloadPng = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement("a");
      link.download = `protea-qr-${qrType}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  // === SHARED STYLES ===
  const sectionLabel = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.35em",
    textTransform: "uppercase",
    color: C.accent,
    marginBottom: 8,
    fontFamily: "'Jost', sans-serif",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    fontSize: 14,
    fontFamily: "'Jost', sans-serif",
    backgroundColor: "#fff",
    color: C.text,
    boxSizing: "border-box",
    outline: "none",
  };

  const selectStyle = { ...inputStyle, cursor: "pointer" };

  const makeBtn = (bg = C.mid, color = "#fff") => ({
    padding: "12px 24px",
    backgroundColor: bg,
    color: color,
    border: "none",
    borderRadius: 2,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
    transition: "opacity 0.2s",
  });

  const row = {
    display: "flex",
    gap: 16,
    marginBottom: 24,
  };

  const fieldWrap = {
    flex: 1,
    marginBottom: 0,
  };

  const hint = {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  };

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", color: C.text }}>
      {/* Page title */}
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 28,
          fontWeight: 400,
          marginBottom: 6,
        }}
      >
        QR Code Generator
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 32 }}>
        Generate QR codes for products, promotions, and marketing campaigns.
      </div>

      {/* Domain */}
      <div style={{ marginBottom: 24 }}>
        <div style={sectionLabel}>Production Domain</div>
        <input
          style={inputStyle}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="https://protea.bot"
        />
        <div style={hint}>
          Use http://localhost:3000 for testing. Update to production domain
          before printing.
        </div>
      </div>

      {/* QR Type */}
      <div style={{ marginBottom: 24 }}>
        <div style={sectionLabel}>QR Type</div>
        <select
          style={selectStyle}
          value={qrType}
          onChange={(e) => {
            setQrType(e.target.value);
            setGeneratedUrl("");
          }}
        >
          {QR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <div style={hint}>{QR_TYPES.find((t) => t.value === qrType)?.desc}</div>
      </div>

      {/* === Type-specific fields === */}

      {qrType === "standard" && (
        <div style={row}>
          <div style={fieldWrap}>
            <div style={sectionLabel}>Product Code (4 digits)</div>
            <input
              style={inputStyle}
              value={productCode}
              onChange={(e) =>
                setProductCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="0006"
              maxLength={4}
            />
            <div style={hint}>
              Full code: PB-001-2026-{productCode.padStart(4, "0")}
            </div>
          </div>
          <div style={fieldWrap}>
            <div style={sectionLabel}>Source</div>
            <select
              style={selectStyle}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {qrType === "promo" && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>Promo Code</div>
          <input
            style={inputStyle}
            value={promoCode}
            onChange={(e) =>
              setPromoCode(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              )
            }
            placeholder="preregister-1000"
          />
          <div style={hint}>
            Lowercase, hyphens only. Must match PromoBanner config.
          </div>
        </div>
      )}

      {qrType === "product" && (
        <div style={row}>
          <div style={fieldWrap}>
            <div style={sectionLabel}>Strain</div>
            <select
              style={selectStyle}
              value={strain}
              onChange={(e) => setStrain(e.target.value)}
            >
              {STRAINS.map((s) => (
                <option key={s} value={s}>
                  {s
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldWrap}>
            <div style={sectionLabel}>Source</div>
            <select
              style={selectStyle}
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {qrType === "custom" && (
        <div style={{ marginBottom: 24 }}>
          <div style={sectionLabel}>Full URL</div>
          <input
            style={inputStyle}
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://protea.bot/anything"
          />
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generateUrl}
        style={makeBtn(C.mid, "#fff")}
        onMouseEnter={(e) => {
          e.target.style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = "1";
        }}
      >
        Generate QR Code
      </button>

      {/* === Output === */}
      {generatedUrl && (
        <div
          style={{
            marginTop: 32,
            padding: 32,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            textAlign: "center",
            backgroundColor: "#fff",
          }}
        >
          <div ref={qrRef} style={{ marginBottom: 20 }}>
            <QRCodeSVG
              value={generatedUrl}
              size={220}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor={C.green}
            />
          </div>

          {/* URL display */}
          <div
            style={{
              fontSize: 12,
              color: C.muted,
              wordBreak: "break-all",
              marginBottom: 20,
              padding: "10px 14px",
              backgroundColor: C.cream,
              borderRadius: 2,
              border: `1px solid ${C.border}`,
              fontFamily: "monospace",
            }}
          >
            {generatedUrl}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={copyToClipboard}
              style={makeBtn(copied ? C.accent : C.mid, "#fff")}
              onMouseEnter={(e) => {
                e.target.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = "1";
              }}
            >
              {copied ? "✓ Copied!" : "Copy URL"}
            </button>
            <button
              onClick={downloadPng}
              style={makeBtn(C.gold, "#fff")}
              onMouseEnter={(e) => {
                e.target.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = "1";
              }}
            >
              Download PNG
            </button>
          </div>
        </div>
      )}

      {/* Quick reference */}
      <div
        style={{
          marginTop: 40,
          padding: 24,
          backgroundColor: C.cream,
          borderRadius: 2,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ ...sectionLabel, marginBottom: 12 }}>
          Quick Reference — QR Types
        </div>
        {[
          [
            "Standard",
            "/scan/PB-001-2026-XXXX?source=packaging",
            "Inner packaging → loyalty points",
          ],
          [
            "Promo",
            "/?promo=preregister-1000&source=promo",
            "Flyers/social → landing + banner",
          ],
          [
            "Product",
            "/verify/gelato-41?source=flyer",
            "Outer packaging → public COA",
          ],
          ["Custom", "Any URL", "Business cards, events, etc."],
        ].map(([type, url, use], i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              padding: "8px 0",
              borderBottom: i < 3 ? `1px solid ${C.border}` : "none",
              fontSize: 12,
              color: C.text,
            }}
          >
            <div
              style={{
                width: 80,
                fontWeight: 600,
                color: C.mid,
                flexShrink: 0,
              }}
            >
              {type}
            </div>
            <div
              style={{
                flex: 1,
                fontFamily: "monospace",
                color: C.muted,
                fontSize: 11,
              }}
            >
              {url}
            </div>
            <div style={{ width: 200, color: C.muted, flexShrink: 0 }}>
              {use}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
