// src/components/AdminQrList.js
// v1.1 — March 2026 — removed created_at (not in schema), syntax clean

import React, { useState, useEffect, useRef } from "react";
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

export default function AdminQrList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSigned, setFilterSigned] = useState("all");
  const [filterClaimed, setFilterClaimed] = useState("all");
  const [copiedId, setCopiedId] = useState(null);
  const qrRefs = useRef({});

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
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
  }

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

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function copyUrl(product) {
    const url = `${DOMAIN}/scan/${product.qr_code}?source=packaging`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(product.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function downloadPng(product) {
    const container = qrRefs.current[product.id];
    if (!container) return;
    const svg = container.querySelector("svg");
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
      link.download = `protea-qr-${(product.qr_code || product.id).split(".")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  }

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
    padding: "9px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    backgroundColor: "#fff",
    color: C.text,
    outline: "none",
  };

  const makeBtn = (bg, color = "#fff") => ({
    padding: "7px 14px",
    backgroundColor: bg,
    color,
    border: "none",
    borderRadius: 2,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'Jost', sans-serif",
    whiteSpace: "nowrap",
  });

  const signedBadge = (signed) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    backgroundColor: signed ? "#eafaf1" : "#fefefe",
    border: `1px solid ${signed ? C.success : C.border}`,
    color: signed ? C.success : C.muted,
  });

  const claimedBadge = (claimed) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    backgroundColor: claimed ? "#fdf0ef" : "#f0faf4",
    border: `1px solid ${claimed ? "#e8c0bb" : "#b8e0c8"}`,
    color: claimed ? C.error : C.success,
  });

  const totalSigned = products.filter((p) => p.hmac_signed).length;
  const totalClaimed = products.filter((p) => p.claimed).length;
  const totalScans = products.reduce((sum, p) => sum + (p.scan_count || 0), 0);

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", color: C.text }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
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
            All product QR codes — click any row to reveal the QR image
          </div>
        </div>
        <button
          onClick={fetchProducts}
          style={makeBtn(C.mid)}
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

      {/* Summary strip */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
      >
        {[
          ["Total Codes", products.length, C.text],
          ["HMAC Signed", totalSigned, C.success],
          ["Unsigned", products.length - totalSigned, C.warning],
          ["Claimed", totalClaimed, C.error],
          ["Available", products.length - totalClaimed, C.mid],
          ["Total Scans", totalScans, C.accent],
        ].map(([label, val, color]) => (
          <div
            key={label}
            style={{
              flex: 1,
              minWidth: 100,
              padding: "14px 16px",
              backgroundColor: "#fff",
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
            <div
              style={{
                fontSize: 10,
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
        style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}
      >
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          placeholder="Search by QR code, strain, batch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={{ ...inputStyle, cursor: "pointer" }}
          value={filterSigned}
          onChange={(e) => setFilterSigned(e.target.value)}
        >
          <option value="all">All signatures</option>
          <option value="signed">HMAC Signed only</option>
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

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
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
            padding: 48,
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
            padding: 48,
            color: C.muted,
            fontSize: 13,
          }}
        >
          No QR codes found. Generate codes in the Smart QR tab.
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr 0.6fr 0.6fr 1.4fr",
              padding: "10px 16px",
              backgroundColor: C.cream,
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            {[
              "QR Code",
              "Batch / Strain",
              "Signature",
              "Status",
              "Scans",
              "Pts",
              "Actions",
            ].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: C.muted,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((product, i) => {
            const isExpanded = expandedId === product.id;
            const scanUrl = `${DOMAIN}/scan/${product.qr_code}?source=packaging`;
            const isLast = i === filtered.length - 1;

            return (
              <div
                key={product.id}
                style={{
                  borderBottom: isLast ? "none" : `1px solid ${C.border}`,
                }}
              >
                {/* Main row */}
                <div
                  onClick={() => toggleExpand(product.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "2fr 1.2fr 1fr 0.8fr 0.6fr 0.6fr 1.4fr",
                    padding: "12px 16px",
                    alignItems: "center",
                    cursor: "pointer",
                    backgroundColor: isExpanded ? "#f4f9f6" : "#fff",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded)
                      e.currentTarget.style.backgroundColor = "#f9faf9";
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded)
                      e.currentTarget.style.backgroundColor = "#fff";
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: C.text,
                        wordBreak: "break-all",
                      }}
                    >
                      {product.qr_code || "—"}
                    </div>
                    <div
                      style={{ fontSize: 10, color: C.accent, marginTop: 2 }}
                    >
                      {isExpanded ? "▲ hide" : "▼ show QR"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: C.text }}>
                      {product.batches?.product_name || "—"}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>
                      {product.batches?.batch_number || ""}
                    </div>
                  </div>

                  <div>
                    <span style={signedBadge(product.hmac_signed)}>
                      {product.hmac_signed ? "🔒 Signed" : "Unsigned"}
                    </span>
                  </div>

                  <div>
                    <span style={claimedBadge(product.claimed)}>
                      {product.claimed ? "Claimed" : "Available"}
                    </span>
                  </div>

                  <div
                    style={{ fontSize: 14, fontWeight: 700, color: C.accent }}
                  >
                    {product.scan_count || 0}
                  </div>

                  <div style={{ fontSize: 13, color: C.text }}>
                    {product.points_value || 10}
                  </div>

                  <div
                    style={{ display: "flex", gap: 6 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => copyUrl(product)}
                      style={makeBtn(
                        copiedId === product.id ? C.accent : C.mid,
                      )}
                      onMouseEnter={(e) => {
                        e.target.style.opacity = "0.8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = "1";
                      }}
                    >
                      {copiedId === product.id ? "✓" : "Copy"}
                    </button>
                    <button
                      onClick={() => {
                        if (!isExpanded) setExpandedId(product.id);
                        setTimeout(() => downloadPng(product), 120);
                      }}
                      style={makeBtn(C.gold)}
                      onMouseEnter={(e) => {
                        e.target.style.opacity = "0.8";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.opacity = "1";
                      }}
                    >
                      PNG
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "24px 32px",
                      backgroundColor: "#f4f9f6",
                      borderTop: `1px solid ${C.border}`,
                      display: "flex",
                      gap: 40,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* QR image */}
                    <div
                      ref={(el) => {
                        qrRefs.current[product.id] = el;
                      }}
                      style={{ flexShrink: 0 }}
                    >
                      <QRCodeSVG
                        value={scanUrl}
                        size={180}
                        level="H"
                        includeMargin
                        bgColor="#ffffff"
                        fgColor={C.green}
                      />
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ ...sectionLabel, marginBottom: 12 }}>
                        Code Details
                      </div>
                      {[
                        ["QR String", product.qr_code || "—"],
                        ["Scan URL", scanUrl],
                        ["Product", product.batches?.product_name || "—"],
                        ["Batch", product.batches?.batch_number || "—"],
                        ["Strain", product.batches?.strain || "—"],
                        [
                          "HMAC Signed",
                          product.hmac_signed
                            ? "Yes ✓"
                            : "No — legacy unsigned",
                        ],
                        [
                          "Status",
                          product.claimed
                            ? "Claimed" +
                              (product.claimed_at
                                ? " on " +
                                  new Date(
                                    product.claimed_at,
                                  ).toLocaleDateString()
                                : "")
                            : "Available",
                        ],
                        ["Scan Count", String(product.scan_count || 0)],
                        ["Points Value", String(product.points_value || 10)],
                      ].map(([label, val]) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            gap: 12,
                            padding: "5px 0",
                            borderBottom: `1px solid ${C.border}`,
                            fontSize: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 110,
                              color: C.muted,
                              flexShrink: 0,
                            }}
                          >
                            {label}
                          </div>
                          <div
                            style={{
                              color: C.text,
                              wordBreak: "break-all",
                              fontFamily:
                                label === "QR String" || label === "Scan URL"
                                  ? "monospace"
                                  : "inherit",
                            }}
                          >
                            {val}
                          </div>
                        </div>
                      ))}

                      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                        <button
                          onClick={() => copyUrl(product)}
                          style={makeBtn(
                            copiedId === product.id ? C.accent : C.mid,
                          )}
                          onMouseEnter={(e) => {
                            e.target.style.opacity = "0.8";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.opacity = "1";
                          }}
                        >
                          {copiedId === product.id
                            ? "✓ Copied!"
                            : "Copy Scan URL"}
                        </button>
                        <button
                          onClick={() => downloadPng(product)}
                          style={makeBtn(C.gold)}
                          onMouseEnter={(e) => {
                            e.target.style.opacity = "0.8";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.opacity = "1";
                          }}
                        >
                          Download PNG
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
