// src/components/AdminQrList.js
// v2.0 — March 2026
// QR Code Registry — card grid view
//
// Changes from v1.1:
//   - Redesigned as card grid (3-col desktop, 2-col tablet, 1-col mobile)
//   - QR image always visible on every card — no click-to-expand
//   - "Test Scan" button on every card — opens /scan/[code] in new tab
//   - Download PNG per card
//   - Copy URL per card
//   - Full product details visible at a glance: name, batch, strain, status
//   - Filter bar preserved

import React, { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../services/supabaseClient";

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

const DOMAIN = window.location.origin;

// ── PNG download helper ───────────────────────────────────────────────────────
function downloadQrPng(svgEl, filename) {
  if (!svgEl) return;
  const svgData = new XMLSerializer().serializeToString(svgEl);
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
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src =
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}

// ── QR Card ───────────────────────────────────────────────────────────────────
function QrCard({ product, onCopyDone }) {
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const scanUrl = `${DOMAIN}/scan/${product.qr_code}?source=packaging`;

  function handleCopy() {
    navigator.clipboard.writeText(scanUrl).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = scanUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCopyDone) onCopyDone(product.id);
  }

  function handleDownload() {
    const svg = qrRef.current?.querySelector("svg");
    const codePart = (product.qr_code || product.id).split(".")[0];
    downloadQrPng(svg, `protea-qr-${codePart}.png`);
  }

  const isClaimed = product.claimed;
  const isSigned = product.hmac_signed;

  const btnBase = {
    padding: "7px 12px",
    border: "none",
    borderRadius: 2,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
    transition: "opacity 0.2s",
  };

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${C.border}`,
        borderRadius: 2,
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Status stripe at top */}
      <div
        style={{
          height: 3,
          background: isClaimed ? C.gold : C.accent,
        }}
      />

      {/* QR Image */}
      <div
        ref={qrRef}
        style={{
          background: isClaimed ? "#fffdf8" : "#f4faf7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px 16px",
          position: "relative",
        }}
      >
        <QRCodeSVG
          value={scanUrl}
          size={150}
          level="H"
          includeMargin
          bgColor="transparent"
          fgColor={isClaimed ? C.gold : C.green}
        />
        {isClaimed && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.45)",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: C.gold,
                border: `1px solid ${C.gold}`,
                padding: "3px 10px",
                borderRadius: 2,
                background: "rgba(255,255,255,0.9)",
              }}
            >
              Claimed
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div
        style={{
          padding: "14px 16px 16px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Product name */}
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 18,
            fontWeight: 400,
            color: C.text,
            marginBottom: 2,
            lineHeight: 1.2,
          }}
        >
          {product.batches?.product_name || "Unnamed Product"}
        </div>

        {/* Batch + strain */}
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            marginBottom: 10,
            fontWeight: 300,
          }}
        >
          {product.batches?.batch_number || "No batch"}
          {product.batches?.strain
            ? ` · ${product.batches.strain.replace(/-/g, " ")}`
            : ""}
        </div>

        {/* Badges row */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 2,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: isSigned ? "#eafaf1" : "#fafafa",
              border: `1px solid ${isSigned ? C.success : C.border}`,
              color: isSigned ? C.success : C.muted,
            }}
          >
            {isSigned ? "🔒 Signed" : "Unsigned"}
          </span>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 2,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: isClaimed ? "#fdf0ef" : "#f0faf4",
              border: `1px solid ${isClaimed ? "#e8c0bb" : "#b8e0c8"}`,
              color: isClaimed ? C.error : C.success,
            }}
          >
            {isClaimed ? "Claimed" : "Available"}
          </span>
        </div>

        {/* Stats */}
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            marginBottom: 10,
            display: "flex",
            gap: 16,
          }}
        >
          <span>{product.scan_count || 0} scans</span>
          <span>{product.points_value || 10} pts</span>
          {isClaimed && product.claimed_at && (
            <span>
              {new Date(product.claimed_at).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>

        {/* QR code string (truncated) */}
        <div
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            color: C.muted,
            marginBottom: 12,
            wordBreak: "break-all",
            padding: "6px 8px",
            background: C.cream,
            borderRadius: 2,
            border: `1px solid ${C.border}`,
          }}
        >
          {product.qr_code?.length > 36
            ? product.qr_code.slice(0, 20) + "…" + product.qr_code.slice(-8)
            : product.qr_code || "—"}
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: "auto",
          }}
        >
          <button
            onClick={() => window.open(scanUrl, "_blank")}
            style={{
              ...btnBase,
              background: C.accent,
              color: "#fff",
              flex: "1 1 auto",
            }}
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
            onClick={handleCopy}
            style={{
              ...btnBase,
              background: copied ? C.accent : C.mid,
              color: "#fff",
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = "1";
            }}
          >
            {copied ? "✓" : "URL"}
          </button>
          <button
            onClick={handleDownload}
            style={{ ...btnBase, background: C.gold, color: "#fff" }}
            onMouseEnter={(e) => {
              e.target.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = "1";
            }}
          >
            PNG
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminQrList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterSigned, setFilterSigned] = useState("all");
  const [filterClaimed, setFilterClaimed] = useState("all");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: dbErr } = await supabase
        .from("products")
        .select(
          `
          id, qr_code, hmac_signed, claimed, claimed_at, claimed_by,
          status, scan_count, points_value, is_active,
          batches ( batch_number, product_name, strain )
        `,
        )
        .order("id", { ascending: false });
      if (dbErr) throw dbErr;
      setProducts(data || []);
    } catch (err) {
      setError("Failed to load QR codes: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter((p) => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      (p.qr_code || "").toLowerCase().includes(term) ||
      (p.batches?.strain || "").toLowerCase().includes(term) ||
      (p.batches?.product_name || "").toLowerCase().includes(term) ||
      (p.batches?.batch_number || "").toLowerCase().includes(term);
    const matchSigned =
      filterSigned === "all" ||
      (filterSigned === "signed" && p.hmac_signed) ||
      (filterSigned === "unsigned" && !p.hmac_signed);
    const matchClaimed =
      filterClaimed === "all" ||
      (filterClaimed === "claimed" && p.claimed) ||
      (filterClaimed === "unclaimed" && !p.claimed);
    return matchSearch && matchSigned && matchClaimed;
  });

  const totalSigned = products.filter((p) => p.hmac_signed).length;
  const totalClaimed = products.filter((p) => p.claimed).length;
  const totalScans = products.reduce((sum, p) => sum + (p.scan_count || 0), 0);

  const inputStyle = {
    padding: "9px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    backgroundColor: "#fff",
    color: C.text,
    outline: "none",
  };

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", color: C.text }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 26,
              fontWeight: 400,
              marginBottom: 4,
            }}
          >
            QR Code Registry
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            All product QR codes — click "Test Scan" to see what your customer
            sees
          </div>
        </div>
        <button
          onClick={fetchProducts}
          style={{
            padding: "9px 18px",
            backgroundColor: C.mid,
            color: "#fff",
            border: "none",
            borderRadius: 2,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontFamily: "'Jost', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.target.style.opacity = "0.8";
          }}
          onMouseLeave={(e) => {
            e.target.style.opacity = "1";
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[
          ["Total Codes", products.length, C.text],
          ["🔒 Signed", totalSigned, C.success],
          ["Unsigned", products.length - totalSigned, C.warning],
          ["Claimed", totalClaimed, C.error],
          ["Available", products.length - totalClaimed, C.mid],
          ["Total Scans", totalScans, C.accent],
        ].map(([label, val, color]) => (
          <div
            key={label}
            style={{
              flex: "1 1 100px",
              minWidth: 90,
              padding: "12px 14px",
              backgroundColor: "#fff",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
              }}
            >
              {val}
            </div>
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}
      >
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          placeholder="Search by QR code, product, strain, batch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={{ ...inputStyle, cursor: "pointer" }}
          value={filterSigned}
          onChange={(e) => setFilterSigned(e.target.value)}
        >
          <option value="all">All signatures</option>
          <option value="signed">Signed only</option>
          <option value="unsigned">Unsigned only</option>
        </select>
        <select
          style={{ ...inputStyle, cursor: "pointer" }}
          value={filterClaimed}
          onChange={(e) => setFilterClaimed(e.target.value)}
        >
          <option value="all">All status</option>
          <option value="unclaimed">Available only</option>
          <option value="claimed">Claimed only</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Showing {filtered.length} of {products.length} codes
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#fdf0ef",
            border: `1px solid ${C.error}`,
            borderRadius: 2,
            fontSize: 13,
            color: C.error,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: C.muted,
            fontSize: 13,
          }}
        >
          Loading QR codes…
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: C.muted,
            fontSize: 13,
          }}
        >
          {products.length === 0
            ? "No QR codes found. Generate codes in the Generate tab."
            : "No codes match your filters."}
        </div>
      )}

      {/* Card grid */}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((product) => (
            <QrCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
