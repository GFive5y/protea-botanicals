// src/pages/AdminQrGenerator.js
// v2.0 — March 2026
// Admin QR Code Generator — HMAC signing added (DEC-025)
//
// Changes from v1.0:
//   - generateUrl() now calls sign-qr Edge Function for Standard + Product QR types
//   - Signed QR URL displayed + saved to products table (qr_code column)
//   - Admin sees SIGNED / UNSIGNED badge per generated code
//   - "Save to Database" button stores signed QR in products table
//   - Promo + Custom types unchanged (don't need HMAC — they're public URLs)
//
// Accessible at /admin/qr (requires admin role)
// Uses inline styles + tokens.js design system (NO Tailwind)

import React, { useState, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../services/supabaseClient";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  error: "#c0392b",
  success: "#27ae60",
};

const QR_TYPES = [
  {
    value: "standard",
    label: "Standard Product QR",
    desc: "Inner packaging → /scan/:code for loyalty points — HMAC SIGNED",
    needsHMAC: true,
  },
  {
    value: "promo",
    label: "Promo Campaign QR",
    desc: "Marketing → landing with ?promo= parameter — no signing needed",
    needsHMAC: false,
  },
  {
    value: "product",
    label: "Product Verification QR",
    desc: "Outer packaging → /verify/:strainId (public COA) — HMAC SIGNED",
    needsHMAC: true,
  },
  {
    value: "custom",
    label: "Custom URL QR",
    desc: "Any URL — flyers, social, business cards — no signing needed",
    needsHMAC: false,
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
  const [signedProductCode, setSignedProductCode] = useState(""); // the raw "PB-xxx.SIG" string
  const [isSigned, setIsSigned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "saving" | "saved" | "error"
  const qrRef = useRef(null);

  // Type-specific state
  const [productCode, setProductCode] = useState("0006");
  const [batchId, setBatchId] = useState(""); // UUID of batch — needed for HMAC
  const [source, setSource] = useState("packaging");
  const [promoCode, setPromoCode] = useState("preregister-1000");
  const [strain, setStrain] = useState("pineapple-express");
  const [customUrl, setCustomUrl] = useState("");

  // ── Shared styles ──────────────────────────────────────────────────────────
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

  const makeBtn = (bg = C.mid, color = "#fff", disabled = false) => ({
    padding: "12px 24px",
    backgroundColor: disabled ? C.muted : bg,
    color,
    border: "none",
    borderRadius: 2,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Jost', sans-serif",
    transition: "opacity 0.2s",
    opacity: disabled ? 0.6 : 1,
  });

  const row = { display: "flex", gap: 16, marginBottom: 24 };
  const fieldWrap = { flex: 1, marginBottom: 0 };
  const hint = { fontSize: 11, color: C.muted, marginTop: 4 };

  // ── callSignQr — call sign-qr Edge Function ─────────────────────────────────
  async function callSignQr(productCodeStr, batchIdStr) {
    try {
      // Get current user session for auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/sign-qr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.REACT_APP_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({
          product_code: productCodeStr,
          batch_id: batchIdStr,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      return data.signed_qr;
    } catch (err) {
      throw new Error(`Signing failed: ${err.message}`);
    }
  }

  // ── generateUrl ───────────────────────────────────────────────────────────
  const generateUrl = useCallback(async () => {
    setSignError("");
    setIsSigned(false);
    setSignedProductCode("");
    setSaveStatus("");

    const currentType = QR_TYPES.find((t) => t.value === qrType);
    const needsHMAC = currentType?.needsHMAC;
    const fullProductCode = `PB-001-2026-${productCode.padStart(4, "0")}`;

    // ── Non-HMAC types (promo, custom) ──────────────────────────
    if (!needsHMAC) {
      let url = "";
      if (qrType === "promo") {
        url = `${domain}/?promo=${promoCode}&source=promo`;
      } else {
        url = customUrl || domain;
      }
      setGeneratedUrl(url);
      setIsSigned(false);
      setCopied(false);
      return;
    }

    // ── HMAC types (standard, product) ──────────────────────────
    if (!batchId.trim()) {
      setSignError(
        "Batch ID is required to generate a signed QR code. Paste the UUID from the batches table.",
      );
      return;
    }

    setSigning(true);
    try {
      const codeToSign = qrType === "product" ? strain : fullProductCode;
      const signed = await callSignQr(codeToSign, batchId.trim());

      // The QR code encodes the SIGNED string directly.
      // The scan URL includes the signed code so scanService can verify it.
      let url = "";
      if (qrType === "standard") {
        url = `${domain}/scan/${signed}?source=${source}`;
      } else if (qrType === "product") {
        url = `${domain}/verify/${signed}?source=${source}`;
      }

      setSignedProductCode(signed);
      setGeneratedUrl(url);
      setIsSigned(true);
      setCopied(false);
    } catch (err) {
      setSignError(err.message);
    } finally {
      setSigning(false);
    }
  }, [
    qrType,
    domain,
    productCode,
    batchId,
    source,
    promoCode,
    strain,
    customUrl,
  ]);

  // ── saveToDatabase — store signed QR in products table ─────────────────────
  const saveToDatabase = async () => {
    if (!signedProductCode || !batchId.trim()) return;
    setSaveStatus("saving");
    try {
      // Update the product row: set qr_code = signedProductCode, hmac_signed = true
      // Match on the unsigned product_code first (pre-signing the row exists with old qr_code)
      const unsignedCode = `PB-001-2026-${productCode.padStart(4, "0")}`;

      const { error } = await supabase
        .from("products")
        .update({
          qr_code: signedProductCode,
          hmac_signed: true,
        })
        .eq("qr_code", unsignedCode);

      if (error) throw error;
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save to DB error:", err);
      setSaveStatus("error");
    }
  };

  // ── copyToClipboard ───────────────────────────────────────────────────────
  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(generatedUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
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

  // ── downloadPng ───────────────────────────────────────────────────────────
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

  const currentTypeConfig = QR_TYPES.find((t) => t.value === qrType);

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", color: C.text }}>
      {/* Title */}
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
        Generate cryptographically signed QR codes for products, promotions, and
        marketing campaigns.
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
            setSignedProductCode("");
            setIsSigned(false);
            setSignError("");
            setSaveStatus("");
          }}
        >
          {QR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <div style={hint}>{currentTypeConfig?.desc}</div>
      </div>

      {/* Type-specific fields */}

      {qrType === "standard" && (
        <>
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
          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Batch ID (UUID) — Required for HMAC</div>
            <input
              style={inputStyle}
              value={batchId}
              onChange={(e) => setBatchId(e.target.value.trim())}
              placeholder="e.g. 3f2504e0-4f89-11d3-9a0c-0305e82c3301"
            />
            <div style={hint}>
              Paste the UUID from the batches table in Supabase. This is used to
              compute the cryptographic signature. Go to: Supabase → Table
              Editor → batches → copy the id column for this batch.
            </div>
          </div>
        </>
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
        <>
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
          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Batch ID (UUID) — Required for HMAC</div>
            <input
              style={inputStyle}
              value={batchId}
              onChange={(e) => setBatchId(e.target.value.trim())}
              placeholder="e.g. 3f2504e0-4f89-11d3-9a0c-0305e82c3301"
            />
            <div style={hint}>
              Paste the batch UUID from Supabase → Table Editor → batches → id
              column.
            </div>
          </div>
        </>
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

      {/* Sign error */}
      {signError && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            backgroundColor: "#fdf0ef",
            border: `1px solid ${C.error}`,
            borderRadius: 2,
            fontSize: 13,
            color: C.error,
          }}
        >
          ⚠ {signError}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generateUrl}
        disabled={signing}
        style={makeBtn(C.mid, "#fff", signing)}
        onMouseEnter={(e) => {
          if (!signing) e.target.style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = "1";
        }}
      >
        {signing ? "Signing…" : "Generate QR Code"}
      </button>

      {/* Output */}
      {generatedUrl && (
        <div
          style={{
            marginTop: 32,
            padding: 32,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            backgroundColor: "#fff",
          }}
        >
          {/* SIGNED / UNSIGNED badge */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            {isSigned ? (
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 14px",
                  backgroundColor: "#eafaf1",
                  border: `1px solid ${C.success}`,
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  color: C.success,
                }}
              >
                🔒 HMAC SIGNED
              </span>
            ) : (
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 14px",
                  backgroundColor: "#fefefe",
                  border: `1px solid ${C.muted}`,
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  color: C.muted,
                }}
              >
                UNSIGNED (promo / custom)
              </span>
            )}
          </div>

          {/* QR code */}
          <div ref={qrRef} style={{ textAlign: "center", marginBottom: 20 }}>
            <QRCodeSVG
              value={generatedUrl}
              size={220}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor={C.green}
            />
          </div>

          {/* Signed code string (for standard/product) */}
          {isSigned && signedProductCode && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...sectionLabel, marginBottom: 4 }}>
                Signed QR Code String
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.text,
                  wordBreak: "break-all",
                  padding: "8px 12px",
                  backgroundColor: "#eafaf1",
                  border: `1px solid ${C.success}`,
                  borderRadius: 2,
                  fontFamily: "monospace",
                }}
              >
                {signedProductCode}
              </div>
              <div style={hint}>
                This exact string is what the QR encodes and what scanService
                verifies on scan.
              </div>
            </div>
          )}

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
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
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

            {/* Save to DB — only for signed standard QR */}
            {isSigned && qrType === "standard" && (
              <button
                onClick={saveToDatabase}
                disabled={saveStatus === "saving" || saveStatus === "saved"}
                style={makeBtn(
                  saveStatus === "saved"
                    ? C.success
                    : saveStatus === "error"
                      ? C.error
                      : C.green,
                  "#fff",
                  saveStatus === "saving" || saveStatus === "saved",
                )}
                onMouseEnter={(e) => {
                  if (saveStatus !== "saved") e.target.style.opacity = "0.85";
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = "1";
                }}
              >
                {saveStatus === "saving"
                  ? "Saving…"
                  : saveStatus === "saved"
                    ? "✓ Saved to DB"
                    : saveStatus === "error"
                      ? "Save Failed"
                      : "Save to Database"}
              </button>
            )}
          </div>

          {saveStatus === "error" && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: C.error,
                textAlign: "center",
              }}
            >
              Could not update products table. Check that a row exists for{" "}
              {productCode.padStart(4, "0")} with the old unsigned qr_code
              value.
            </div>
          )}
          {saveStatus === "saved" && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: C.success,
                textAlign: "center",
              }}
            >
              products.qr_code updated to signed string. hmac_signed = true. ✓
            </div>
          )}
        </div>
      )}

      {/* Legacy codes info box */}
      <div
        style={{
          marginTop: 32,
          padding: 20,
          backgroundColor: "#fffdf5",
          borderRadius: 2,
          border: `1px solid #e8d97a`,
        }}
      >
        <div style={{ ...sectionLabel, color: "#a08020", marginBottom: 8 }}>
          Legacy Code Transition
        </div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>
          Existing QR codes (e.g. <code>PB-001-2026-0001</code>) are
          automatically treated as <strong>legacy unsigned</strong> — they still
          scan and award points during transition. Use the{" "}
          <strong>Save to Database</strong> button above to upgrade each product
          code to a signed string. Once all codes are upgraded, legacy support
          can be removed.
        </div>
      </div>

      {/* Quick reference */}
      <div
        style={{
          marginTop: 24,
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
            "/scan/PB-001-2026-XXXX.SIG?source=packaging",
            "Inner packaging → loyalty points · SIGNED",
          ],
          [
            "Promo",
            "/?promo=preregister-1000&source=promo",
            "Flyers/social → landing + banner",
          ],
          [
            "Product",
            "/verify/gelato-41.SIG?source=flyer",
            "Outer packaging → public COA · SIGNED",
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
            <div style={{ width: 220, color: C.muted, flexShrink: 0 }}>
              {use}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
