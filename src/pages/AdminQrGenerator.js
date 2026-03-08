// src/pages/AdminQrGenerator.js
// v3.0 — March 2026
// Admin QR Code Generator — Bulk signed generation added
//
// Changes from v2.0:
//   - Mode switcher: "Single Code" | "Bulk Generate"
//   - Bulk mode: enter start code, quantity, batch ID → signs all via Edge Function
//   - Bulk results table: shows each signed code + status + progress bar
//   - Bulk inserts new rows into products table (hmac_signed = true)
//   - Export CSV of bulk results
//   - Single mode: unchanged from v2.0
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
  border: "#e0dbd2",
  muted: "#888888",
  text: "#1a1a1a",
  error: "#c0392b",
  success: "#27ae60",
  warning: "#e67e22",
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
  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState("single"); // "single" | "bulk"

  // ── Single mode state ─────────────────────────────────────────────────────
  const [qrType, setQrType] = useState("standard");
  const [domain, setDomain] = useState("http://localhost:3000");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [signedProductCode, setSignedProductCode] = useState("");
  const [isSigned, setIsSigned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const qrRef = useRef(null);

  const [productCode, setProductCode] = useState("0006");
  const [batchId, setBatchId] = useState("");
  const [source, setSource] = useState("packaging");
  const [promoCode, setPromoCode] = useState("preregister-1000");
  const [strain, setStrain] = useState("pineapple-express");
  const [customUrl, setCustomUrl] = useState("");

  // ── Bulk mode state ───────────────────────────────────────────────────────
  const [bulkDomain, setBulkDomain] = useState("http://localhost:3000");
  const [bulkStartCode, setBulkStartCode] = useState("0007");
  const [bulkCount, setBulkCount] = useState("10");
  const [bulkBatchId, setBulkBatchId] = useState("");
  const [bulkSource, setBulkSource] = useState("packaging");
  const [bulkPointsValue, setBulkPointsValue] = useState("10");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0); // 0–100
  const [bulkDone, setBulkDone] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkResults, setBulkResults] = useState([]); // [{code, signedQr, url, status, error}]
  const [bulkError, setBulkError] = useState("");
  const cancelBulkRef = useRef(false);

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

  // ── callSignQr ────────────────────────────────────────────────────────────
  async function callSignQr(productCodeStr, batchIdStr) {
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
  }

  // ── Single: generateUrl ───────────────────────────────────────────────────
  const generateUrl = useCallback(async () => {
    setSignError("");
    setIsSigned(false);
    setSignedProductCode("");
    setSaveStatus("");
    const currentType = QR_TYPES.find((t) => t.value === qrType);
    const needsHMAC = currentType?.needsHMAC;
    const fullProductCode = `PB-001-2026-${productCode.padStart(4, "0")}`;

    if (!needsHMAC) {
      let url =
        qrType === "promo"
          ? `${domain}/?promo=${promoCode}&source=promo`
          : customUrl || domain;
      setGeneratedUrl(url);
      setIsSigned(false);
      setCopied(false);
      return;
    }
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
      const url =
        qrType === "standard"
          ? `${domain}/scan/${signed}?source=${source}`
          : `${domain}/verify/${signed}?source=${source}`;
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

  // ── Single: saveToDatabase ────────────────────────────────────────────────
  const saveToDatabase = async () => {
    if (!signedProductCode || !batchId.trim()) return;
    setSaveStatus("saving");
    try {
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

  // ── Single: clipboard / PNG ───────────────────────────────────────────────
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

  // ── Bulk: runBulkGenerate ─────────────────────────────────────────────────
  const runBulkGenerate = async () => {
    setBulkError("");
    const count = parseInt(bulkCount, 10);
    const startNum = parseInt(bulkStartCode, 10);
    if (!bulkBatchId.trim()) {
      setBulkError("Batch ID is required.");
      return;
    }
    if (isNaN(count) || count < 1 || count > 200) {
      setBulkError("Quantity must be between 1 and 200.");
      return;
    }
    if (isNaN(startNum) || startNum < 1) {
      setBulkError("Start code must be a positive number.");
      return;
    }

    setBulkRunning(true);
    setBulkDone(0);
    setBulkTotal(count);
    setBulkProgress(0);
    setBulkResults([]);
    cancelBulkRef.current = false;

    const results = [];

    for (let i = 0; i < count; i++) {
      if (cancelBulkRef.current) break;

      const codeNum = startNum + i;
      const productCodeStr = `PB-001-2026-${String(codeNum).padStart(4, "0")}`;
      let result = {
        code: productCodeStr,
        signedQr: "",
        url: "",
        status: "pending",
        error: "",
      };

      try {
        const signed = await callSignQr(productCodeStr, bulkBatchId.trim());
        const scanUrl = `${bulkDomain}/scan/${signed}?source=${bulkSource}`;

        // Insert new product row
        const { error: dbErr } = await supabase.from("products").insert({
          qr_code: signed,
          hmac_signed: true,
          status: "available",
          claimed: false,
          scan_count: 0,
          points_value: parseInt(bulkPointsValue, 10) || 10,
          is_active: true,
          batch_id: bulkBatchId.trim(),
        });

        if (dbErr) {
          // Row may already exist — try update instead
          const { error: updErr } = await supabase
            .from("products")
            .update({
              qr_code: signed,
              hmac_signed: true,
            })
            .eq("qr_code", productCodeStr);

          if (updErr) {
            result = {
              ...result,
              signedQr: signed,
              url: scanUrl,
              status: "warn",
              error: "Signed but DB update failed: " + updErr.message,
            };
          } else {
            result = {
              ...result,
              signedQr: signed,
              url: scanUrl,
              status: "updated",
            };
          }
        } else {
          result = {
            ...result,
            signedQr: signed,
            url: scanUrl,
            status: "created",
          };
        }
      } catch (err) {
        result = { ...result, status: "error", error: err.message };
      }

      results.push(result);
      setBulkResults([...results]);
      setBulkDone(i + 1);
      setBulkProgress(Math.round(((i + 1) / count) * 100));

      // Small delay to avoid hammering the Edge Function
      if (i < count - 1) await new Promise((r) => setTimeout(r, 120));
    }

    setBulkRunning(false);
  };

  // ── Bulk: exportCsv ───────────────────────────────────────────────────────
  const exportBulkCsv = () => {
    if (!bulkResults.length) return;
    const header = "Product Code,Signed QR,Scan URL,Status,Error";
    const rows = bulkResults.map(
      (r) =>
        `"${r.code}","${r.signedQr}","${r.url}","${r.status}","${r.error}"`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `protea-bulk-qr-${Date.now()}.csv`;
    link.click();
  };

  const currentTypeConfig = QR_TYPES.find((t) => t.value === qrType);
  const bulkSuccessCount = bulkResults.filter(
    (r) => r.status === "created" || r.status === "updated",
  ).length;
  const bulkErrorCount = bulkResults.filter(
    (r) => r.status === "error" || r.status === "warn",
  ).length;

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
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
        Generate cryptographically signed QR codes for products, promotions, and
        marketing campaigns.
      </div>

      {/* Mode switcher */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 32,
          borderBottom: `2px solid ${C.border}`,
        }}
      >
        {["single", "bulk"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "10px 28px",
              border: "none",
              borderBottom:
                mode === m ? `2px solid ${C.mid}` : "2px solid transparent",
              marginBottom: -2,
              backgroundColor: "transparent",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: mode === m ? C.mid : C.muted,
              cursor: "pointer",
              fontFamily: "'Jost', sans-serif",
              transition: "color 0.2s",
            }}
          >
            {m === "single" ? "Single Code" : "Bulk Generate"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SINGLE MODE
      ══════════════════════════════════════════════════════════════════════ */}
      {mode === "single" && (
        <>
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

          {qrType === "standard" && (
            <>
              <div style={row}>
                <div style={fieldWrap}>
                  <div style={sectionLabel}>Product Code (4 digits)</div>
                  <input
                    style={inputStyle}
                    value={productCode}
                    onChange={(e) =>
                      setProductCode(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
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
                <div style={sectionLabel}>
                  Batch ID (UUID) — Required for HMAC
                </div>
                <input
                  style={inputStyle}
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value.trim())}
                  placeholder="e.g. 3f2504e0-4f89-11d3-9a0c-0305e82c3301"
                />
                <div style={hint}>
                  Paste the UUID from the batches table in Supabase → Table
                  Editor → batches → id column.
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
                <div style={sectionLabel}>
                  Batch ID (UUID) — Required for HMAC
                </div>
                <input
                  style={inputStyle}
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value.trim())}
                  placeholder="e.g. 3f2504e0-4f89-11d3-9a0c-0305e82c3301"
                />
                <div style={hint}>
                  Paste the batch UUID from Supabase → Table Editor → batches →
                  id column.
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
              <div
                ref={qrRef}
                style={{ textAlign: "center", marginBottom: 20 }}
              >
                <QRCodeSVG
                  value={generatedUrl}
                  size={220}
                  level="H"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor={C.green}
                />
              </div>
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
                    This exact string is what the QR encodes and what
                    scanService verifies on scan.
                  </div>
                </div>
              )}
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
                  style={makeBtn(copied ? C.accent : C.mid)}
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
                  style={makeBtn(C.gold)}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = "0.85";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = "1";
                  }}
                >
                  Download PNG
                </button>
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
                      if (saveStatus !== "saved")
                        e.target.style.opacity = "0.85";
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
                  products.qr_code updated to signed string. hmac_signed = true.
                  ✓
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          BULK MODE
      ══════════════════════════════════════════════════════════════════════ */}
      {mode === "bulk" && (
        <>
          <div
            style={{
              padding: "14px 18px",
              backgroundColor: "#f0faf4",
              border: `1px solid #b8e0c8`,
              borderRadius: 2,
              marginBottom: 28,
              fontSize: 12,
              color: C.text,
              lineHeight: 1.7,
            }}
          >
            <strong>Bulk Generate</strong> signs each code via the HMAC Edge
            Function and inserts a new row into the <code>products</code> table.
            Codes are generated sequentially from the start number. Max 200 per
            run.
          </div>

          {/* Domain */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Production Domain</div>
            <input
              style={inputStyle}
              value={bulkDomain}
              onChange={(e) => setBulkDomain(e.target.value)}
              placeholder="https://protea.bot"
            />
            <div style={hint}>Use http://localhost:3000 for testing.</div>
          </div>

          <div style={row}>
            <div style={fieldWrap}>
              <div style={sectionLabel}>Start Code (4 digits)</div>
              <input
                style={inputStyle}
                value={bulkStartCode}
                onChange={(e) =>
                  setBulkStartCode(
                    e.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                placeholder="0007"
                maxLength={4}
                disabled={bulkRunning}
              />
              <div style={hint}>
                First code: PB-001-2026-
                {String(bulkStartCode || "0007").padStart(4, "0")}
              </div>
            </div>
            <div style={fieldWrap}>
              <div style={sectionLabel}>Quantity</div>
              <input
                style={inputStyle}
                value={bulkCount}
                onChange={(e) =>
                  setBulkCount(e.target.value.replace(/\D/g, ""))
                }
                placeholder="10"
                disabled={bulkRunning}
              />
              <div style={hint}>
                {bulkCount && bulkStartCode
                  ? `Will generate: PB-001-2026-${String(bulkStartCode).padStart(4, "0")} → PB-001-2026-${String(parseInt(bulkStartCode, 10) + parseInt(bulkCount, 10) - 1).padStart(4, "0")}`
                  : "Max 200 per run"}
              </div>
            </div>
          </div>

          <div style={row}>
            <div style={fieldWrap}>
              <div style={sectionLabel}>Source</div>
              <select
                style={selectStyle}
                value={bulkSource}
                onChange={(e) => setBulkSource(e.target.value)}
                disabled={bulkRunning}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div style={fieldWrap}>
              <div style={sectionLabel}>Points Value</div>
              <input
                style={inputStyle}
                value={bulkPointsValue}
                onChange={(e) =>
                  setBulkPointsValue(e.target.value.replace(/\D/g, ""))
                }
                placeholder="10"
                disabled={bulkRunning}
              />
              <div style={hint}>Loyalty points awarded per scan.</div>
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={sectionLabel}>Batch ID (UUID) — Required</div>
            <input
              style={inputStyle}
              value={bulkBatchId}
              onChange={(e) => setBulkBatchId(e.target.value.trim())}
              placeholder="e.g. 3f2504e0-4f89-11d3-9a0c-0305e82c3301"
              disabled={bulkRunning}
            />
            <div style={hint}>
              Supabase → Table Editor → batches → copy the id column for this
              batch. All generated codes will be linked to this batch.
            </div>
          </div>

          {bulkError && (
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
              ⚠ {bulkError}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 32,
            }}
          >
            <button
              onClick={runBulkGenerate}
              disabled={bulkRunning}
              style={makeBtn(C.green, "#fff", bulkRunning)}
              onMouseEnter={(e) => {
                if (!bulkRunning) e.target.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = "1";
              }}
            >
              {bulkRunning
                ? `Generating… ${bulkDone}/${bulkTotal}`
                : "Generate All Codes"}
            </button>
            {bulkRunning && (
              <button
                onClick={() => {
                  cancelBulkRef.current = true;
                }}
                style={{ ...makeBtn(C.error), padding: "12px 20px" }}
              >
                Cancel
              </button>
            )}
            {bulkResults.length > 0 && !bulkRunning && (
              <button
                onClick={exportBulkCsv}
                style={makeBtn(C.gold)}
                onMouseEnter={(e) => {
                  e.target.style.opacity = "0.85";
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = "1";
                }}
              >
                Export CSV
              </button>
            )}
          </div>

          {/* Progress bar */}
          {(bulkRunning || bulkProgress > 0) && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  fontSize: 12,
                  color: C.muted,
                }}
              >
                <span>
                  {bulkRunning
                    ? "Signing and saving codes…"
                    : `Complete — ${bulkSuccessCount} saved, ${bulkErrorCount} errors`}
                </span>
                <span>{bulkProgress}%</span>
              </div>
              <div
                style={{
                  height: 8,
                  backgroundColor: C.border,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${bulkProgress}%`,
                    backgroundColor: bulkErrorCount > 0 ? C.warning : C.accent,
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* Results summary */}
          {bulkResults.length > 0 && (
            <div
              style={{
                marginBottom: 12,
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {[
                [
                  "Created",
                  bulkResults.filter((r) => r.status === "created").length,
                  C.success,
                ],
                [
                  "Updated",
                  bulkResults.filter((r) => r.status === "updated").length,
                  C.mid,
                ],
                [
                  "Errors",
                  bulkErrorCount,
                  bulkErrorCount > 0 ? C.error : C.muted,
                ],
              ].map(([label, val, color]) => (
                <div
                  key={label}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#fff",
                    border: `1px solid ${C.border}`,
                    borderRadius: 2,
                    textAlign: "center",
                    minWidth: 90,
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>
                    {val}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: C.muted,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results table */}
          {bulkResults.length > 0 && (
            <div
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 2fr 0.7fr 1.5fr",
                  padding: "8px 14px",
                  backgroundColor: C.cream,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {["Code", "Signed QR", "Status", "Error"].map((h) => (
                  <div
                    key={h}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: C.muted,
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {bulkResults.map((r, i) => {
                const statusColor =
                  r.status === "created"
                    ? C.success
                    : r.status === "updated"
                      ? C.mid
                      : r.status === "error"
                        ? C.error
                        : C.warning;
                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 2fr 0.7fr 1.5fr",
                      padding: "9px 14px",
                      borderBottom:
                        i < bulkResults.length - 1
                          ? `1px solid ${C.border}`
                          : "none",
                      backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: C.text,
                      }}
                    >
                      {r.code}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: "monospace",
                        color: C.muted,
                        wordBreak: "break-all",
                      }}
                    >
                      {r.signedQr || "—"}
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: statusColor,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {r.status === "created"
                          ? "✓ New"
                          : r.status === "updated"
                            ? "↑ Updated"
                            : r.status === "pending"
                              ? "…"
                              : r.status === "warn"
                                ? "⚠ Warn"
                                : "✗ Err"}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: C.error }}>
                      {r.error || ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Legacy info — shown in single mode only */}
      {mode === "single" && (
        <>
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
              automatically treated as <strong>legacy unsigned</strong> — they
              still scan and award points during transition. Use the{" "}
              <strong>Save to Database</strong> button above to upgrade each
              product code to a signed string. Once all codes are upgraded,
              legacy support can be removed.
            </div>
          </div>
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
        </>
      )}
    </div>
  );
}
