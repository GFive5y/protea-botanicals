// src/pages/AdminQrGenerator.js
// v4.0 — March 2026
// Staff-friendly QR Generator — no Supabase copy-paste required
//
// Changes from v3.0:
//   - Batch ID field REMOVED — replaced with dropdown loaded from DB
//   - Batches fetched on mount: batch_number + product_name shown as options
//   - Next product code auto-suggested from highest existing code in DB
//   - "Test Scan" button appears immediately after generation (opens in new tab)
//   - Bulk mode: same dropdown, no UUID needed
//   - All "paste from Supabase" instructions removed

import React, { useState, useCallback, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../services/supabaseClient";

const SUPABASE_FUNCTIONS_URL =
  process.env.REACT_APP_SUPABASE_FUNCTIONS_URL ||
  "https://uvicrqapgzcdvozxrreo.supabase.co/functions/v1";

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

const SOURCES = [
  "packaging",
  "flyer",
  "social",
  "website",
  "event",
  "wholesale",
];

// ── Shared styles ─────────────────────────────────────────────────────────────
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
const sectionLabel = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: C.accent,
  marginBottom: 8,
  fontFamily: "'Jost', sans-serif",
};
const hint = {
  fontSize: 11,
  color: C.muted,
  marginTop: 4,
  fontFamily: "'Jost', sans-serif",
};
const row = { display: "flex", gap: 16, marginBottom: 24 };
const fieldWrap = { flex: 1, marginBottom: 0 };

function makeBtn(bg = C.mid, color = "#fff", disabled = false) {
  return {
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
  };
}

// ── HMAC signing ──────────────────────────────────────────────────────────────
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

// ── Parse highest code number from DB ────────────────────────────────────────
async function fetchNextCodeNumber() {
  try {
    const { data } = await supabase
      .from("products")
      .select("qr_code")
      .like("qr_code", "PB-001-2026-%")
      .order("qr_code", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return "0001";

    let max = 0;
    for (const p of data) {
      const raw = (p.qr_code || "").split(".")[0]; // strip signature
      const parts = raw.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > max) max = num;
    }
    return String(max + 1).padStart(4, "0");
  } catch {
    return "0001";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminQrGenerator() {
  const [mode, setMode] = useState("single");

  // Batch list loaded from DB
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  // Single mode
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [productCode, setProductCode] = useState("0001");
  const [source, setSource] = useState("packaging");
  const [domain, setDomain] = useState(
    window.location.origin || "http://localhost:3000",
  );
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [signedQr, setSignedQr] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  // Bulk mode
  const [bulkBatchId, setBulkBatchId] = useState("");
  const [bulkStartCode, setBulkStartCode] = useState("0001");
  const [bulkCount, setBulkCount] = useState("10");
  const [bulkSource, setBulkSource] = useState("packaging");
  const [bulkPointsValue, setBulkPointsValue] = useState("10");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkDone, setBulkDone] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkError, setBulkError] = useState("");
  const cancelBulkRef = useRef(false);

  // ── Load batches + suggest next code on mount ────────────────────────────
  useEffect(() => {
    async function load() {
      setBatchesLoading(true);
      try {
        const { data, error } = await supabase
          .from("batches")
          .select("id, batch_number, product_name, strain")
          .order("batch_number", { ascending: false });

        const list = error ? [] : data || [];
        setBatches(list);
        if (list.length > 0) {
          setSelectedBatchId(list[0].id);
          setBulkBatchId(list[0].id);
        }
      } catch {
        setBatches([]);
      } finally {
        setBatchesLoading(false);
      }

      const next = await fetchNextCodeNumber();
      setProductCode(next);
      setBulkStartCode(next);
    }
    load();
  }, []);

  // ── Single: generate ─────────────────────────────────────────────────────
  const generateSingle = useCallback(async () => {
    setSignError("");
    setGeneratedUrl("");
    setSignedQr("");
    setSaveStatus("");

    if (!selectedBatchId) {
      setSignError("Please select a batch.");
      return;
    }
    const fullCode = `PB-001-2026-${productCode.padStart(4, "0")}`;
    setSigning(true);
    try {
      const signed = await callSignQr(fullCode, selectedBatchId);
      const url = `${domain}/scan/${signed}?source=${source}`;
      setSignedQr(signed);
      setGeneratedUrl(url);
    } catch (err) {
      setSignError(err.message);
    } finally {
      setSigning(false);
    }
  }, [selectedBatchId, productCode, domain, source]);

  // ── Single: save to DB ───────────────────────────────────────────────────
  const saveToDatabase = async () => {
    if (!signedQr || !selectedBatchId) return;
    setSaveStatus("saving");
    try {
      const unsignedCode = `PB-001-2026-${productCode.padStart(4, "0")}`;
      // Try update first (code already exists unsigned)
      const { error: upErr, count } = await supabase
        .from("products")
        .update({ qr_code: signedQr, hmac_signed: true })
        .eq("qr_code", unsignedCode)
        .select("id", { count: "exact" });

      if (upErr || count === 0) {
        // Insert as new
        const { error: insErr } = await supabase.from("products").insert({
          qr_code: signedQr,
          hmac_signed: true,
          status: "in_stock",
          claimed: false,
          scan_count: 0,
          points_value: 10,
          is_active: true,
          batch_id: selectedBatchId,
        });
        if (insErr) throw insErr;
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus("error");
    }
  };

  // ── Single: clipboard / PNG ──────────────────────────────────────────────
  const copyUrl = () => {
    navigator.clipboard.writeText(generatedUrl).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = generatedUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      link.download = `protea-qr-${productCode}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  // ── Bulk: run ────────────────────────────────────────────────────────────
  const runBulkGenerate = async () => {
    setBulkError("");
    const count = parseInt(bulkCount, 10);
    const startNum = parseInt(bulkStartCode, 10);
    if (!bulkBatchId) {
      setBulkError("Please select a batch.");
      return;
    }
    if (isNaN(count) || count < 1 || count > 200) {
      setBulkError("Quantity must be 1–200.");
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
        const signed = await callSignQr(productCodeStr, bulkBatchId);
        const scanUrl = `${domain}/scan/${signed}?source=${bulkSource}`;

        const { error: dbErr } = await supabase.from("products").insert({
          qr_code: signed,
          hmac_signed: true,
          status: "in_stock",
          claimed: false,
          scan_count: 0,
          points_value: parseInt(bulkPointsValue, 10) || 10,
          is_active: true,
          batch_id: bulkBatchId,
        });

        if (dbErr) {
          // Try update (pre-existing unsigned code)
          const { error: updErr } = await supabase
            .from("products")
            .update({ qr_code: signed, hmac_signed: true })
            .eq("qr_code", productCodeStr);
          result = {
            ...result,
            signedQr: signed,
            url: scanUrl,
            status: updErr ? "warn" : "updated",
            error: updErr ? "DB update failed: " + updErr.message : "",
          };
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
      if (i < count - 1) await new Promise((r) => setTimeout(r, 120));
    }
    setBulkRunning(false);
  };

  // ── Bulk: export CSV ─────────────────────────────────────────────────────
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

  const bulkSuccessCount = bulkResults.filter(
    (r) => r.status === "created" || r.status === "updated",
  ).length;
  const bulkErrorCount = bulkResults.filter(
    (r) => r.status === "error" || r.status === "warn",
  ).length;
  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
  const bulkSelectedBatch = batches.find((b) => b.id === bulkBatchId);

  // ── Batch dropdown component ─────────────────────────────────────────────
  function BatchDropdown({ value, onChange, disabled }) {
    if (batchesLoading) {
      return (
        <div style={{ ...inputStyle, color: C.muted, cursor: "default" }}>
          Loading batches…
        </div>
      );
    }
    if (batches.length === 0) {
      return (
        <div style={{ ...inputStyle, color: C.error, cursor: "default" }}>
          No batches found. Create a batch in Supabase first.
        </div>
      );
    }
    return (
      <select
        style={selectStyle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">— Select a batch —</option>
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.batch_number} — {b.product_name}
            {b.strain ? ` (${b.strain.replace(/-/g, " ")})` : ""}
          </option>
        ))}
      </select>
    );
  }

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
        Generate cryptographically signed QR codes. Select a batch from the
        dropdown — no Supabase required.
      </div>

      {/* Mode tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 32,
          borderBottom: `2px solid ${C.border}`,
        }}
      >
        {[
          { key: "single", label: "Single Code" },
          { key: "bulk", label: "Bulk Generate" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              padding: "10px 28px",
              border: "none",
              borderBottom:
                mode === m.key ? `2px solid ${C.mid}` : "2px solid transparent",
              marginBottom: -2,
              backgroundColor: "transparent",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: mode === m.key ? C.mid : C.muted,
              cursor: "pointer",
              fontFamily: "'Jost', sans-serif",
              transition: "color 0.2s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ══ SINGLE MODE ══ */}
      {mode === "single" && (
        <>
          {/* Batch selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Select Batch</div>
            <BatchDropdown
              value={selectedBatchId}
              onChange={setSelectedBatchId}
              disabled={signing}
            />
            {selectedBatch && (
              <div style={hint}>
                {selectedBatch.product_name}
                {selectedBatch.strain
                  ? ` · ${selectedBatch.strain.replace(/-/g, " ")}`
                  : ""}
              </div>
            )}
          </div>

          <div style={row}>
            <div style={fieldWrap}>
              <div style={sectionLabel}>Product Code (4 digits)</div>
              <input
                style={inputStyle}
                value={productCode}
                onChange={(e) =>
                  setProductCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="0001"
                maxLength={4}
                disabled={signing}
              />
              <div style={hint}>
                Will sign: PB-001-2026-{productCode.padStart(4, "0")}
              </div>
            </div>
            <div style={fieldWrap}>
              <div style={sectionLabel}>Source</div>
              <select
                style={selectStyle}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={signing}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div style={hint}>Where this QR will be placed</div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Domain</div>
            <input
              style={inputStyle}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={signing}
            />
            <div style={hint}>
              Auto-detected from browser. Update to production domain before
              printing for live use.
            </div>
          </div>

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
            onClick={generateSingle}
            disabled={signing || !selectedBatchId}
            style={makeBtn(C.mid, "#fff", signing || !selectedBatchId)}
            onMouseEnter={(e) => {
              if (!signing) e.target.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = "1";
            }}
          >
            {signing ? "Signing…" : "Generate QR Code"}
          </button>

          {/* ── Result ── */}
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
              {/* Signed badge */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
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
              </div>

              {/* QR image */}
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

              {/* Product info */}
              {selectedBatch && (
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: 16,
                    fontSize: 13,
                    color: C.text,
                    fontWeight: 500,
                  }}
                >
                  {selectedBatch.product_name} · Batch{" "}
                  {selectedBatch.batch_number}
                </div>
              )}

              {/* Signed string */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ ...sectionLabel, marginBottom: 4 }}>
                  Signed QR String
                </div>
                <div
                  style={{
                    fontSize: 12,
                    wordBreak: "break-all",
                    padding: "8px 12px",
                    backgroundColor: "#eafaf1",
                    border: `1px solid ${C.success}`,
                    borderRadius: 2,
                    fontFamily: "monospace",
                  }}
                >
                  {signedQr}
                </div>
              </div>

              {/* URL */}
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
                  gap: 10,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => window.open(generatedUrl, "_blank")}
                  style={makeBtn(C.accent)}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = "0.85";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = "1";
                  }}
                >
                  🔍 Test Scan
                </button>
                <button
                  onClick={copyUrl}
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
                      ? "✓ Saved"
                      : saveStatus === "error"
                        ? "Save Failed"
                        : "Save to Database"}
                </button>
              </div>

              {saveStatus === "saved" && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    color: C.success,
                    textAlign: "center",
                  }}
                >
                  Saved to products table. hmac_signed = true ✓
                </div>
              )}
              {saveStatus === "error" && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 12,
                    color: C.error,
                    textAlign: "center",
                  }}
                >
                  Save failed — check console for details.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══ BULK MODE ══ */}
      {mode === "bulk" && (
        <>
          <div
            style={{
              padding: "14px 18px",
              backgroundColor: "#f0faf4",
              border: "1px solid #b8e0c8",
              borderRadius: 2,
              marginBottom: 28,
              fontSize: 12,
              color: C.text,
              lineHeight: 1.7,
            }}
          >
            <strong>Bulk Generate</strong> signs each code via HMAC and saves it
            to the <code>products</code> table. Codes are generated
            sequentially. Max 200 per run.
          </div>

          {/* Batch dropdown */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Select Batch</div>
            <BatchDropdown
              value={bulkBatchId}
              onChange={setBulkBatchId}
              disabled={bulkRunning}
            />
            {bulkSelectedBatch && (
              <div style={hint}>
                {bulkSelectedBatch.product_name} ·{" "}
                {bulkSelectedBatch.batch_number}
              </div>
            )}
          </div>

          <div style={row}>
            <div style={fieldWrap}>
              <div style={sectionLabel}>Start Code</div>
              <input
                style={inputStyle}
                value={bulkStartCode}
                onChange={(e) =>
                  setBulkStartCode(
                    e.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                placeholder="0001"
                maxLength={4}
                disabled={bulkRunning}
              />
              <div style={hint}>
                First: PB-001-2026-
                {String(bulkStartCode || "0001").padStart(4, "0")}
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
                  ? `PB-001-2026-${String(bulkStartCode).padStart(4, "0")} → PB-001-2026-${String(parseInt(bulkStartCode, 10) + parseInt(bulkCount, 10) - 1).padStart(4, "0")}`
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
              <div style={sectionLabel}>Points per Scan</div>
              <input
                style={inputStyle}
                value={bulkPointsValue}
                onChange={(e) =>
                  setBulkPointsValue(e.target.value.replace(/\D/g, ""))
                }
                placeholder="10"
                disabled={bulkRunning}
              />
              <div style={hint}>Loyalty points awarded on first scan</div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Domain</div>
            <input
              style={inputStyle}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={bulkRunning}
            />
            <div style={hint}>
              Auto-detected. Update before printing for live use.
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
              disabled={bulkRunning || !bulkBatchId}
              style={makeBtn(C.green, "#fff", bulkRunning || !bulkBatchId)}
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
                style={makeBtn(C.error)}
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

          {/* Summary */}
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 2fr 0.7fr 0.8fr 1.2fr",
                  padding: "8px 14px",
                  backgroundColor: C.cream,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {["Code", "Signed QR", "Status", "Test", "Error"].map((h) => (
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
                      gridTemplateColumns: "1.2fr 2fr 0.7fr 0.8fr 1.2fr",
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
                    <div
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
                    </div>
                    <div>
                      {r.url && (
                        <button
                          onClick={() => window.open(r.url, "_blank")}
                          style={{
                            padding: "4px 10px",
                            backgroundColor: C.accent,
                            color: "#fff",
                            border: "none",
                            borderRadius: 2,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.1em",
                            cursor: "pointer",
                            fontFamily: "'Jost', sans-serif",
                          }}
                        >
                          Test
                        </button>
                      )}
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
    </div>
  );
}
