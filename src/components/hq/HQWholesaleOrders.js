// src/components/hq/HQWholesaleOrders.js
// v1.0 — WP-STK Phase 3 Session 2: B2B wholesale order reservation flow
// Draft -> Confirmed (reserve_stock() per line item)
// Confirmed -> Shipped (release_reservation() + sale_out movements)
// Confirmed/Draft -> Cancelled (release_reservation() only)
// Tables: purchase_orders (direction=outbound), purchase_order_items,
//         wholesale_partners, inventory_items, stock_reservations

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  infoBd: "#BFDBFE",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  fontUi: "'Inter','Helvetica Neue',Arial,sans-serif",
  fontData: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const sCard = {
  background: "#fff",
  border: `1px solid ${T.ink150}`,
  borderRadius: "6px",
  padding: "20px",
  boxShadow: T.shadow,
};
const sLabel = {
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: "6px",
  fontFamily: T.fontUi,
  fontWeight: 700,
};
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: T.fontUi,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };
const sBtn = (v = "primary") => ({
  padding: "8px 16px",
  background:
    v === "primary"
      ? T.accent
      : v === "danger"
        ? T.danger
        : v === "warning"
          ? T.warning
          : "transparent",
  color: ["primary", "danger", "warning"].includes(v) ? "#fff" : T.accentMid,
  border: ["primary", "danger", "warning"].includes(v)
    ? "none"
    : `1px solid ${T.accentBd}`,
  borderRadius: "4px",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.fontUi,
});
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "9px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.ink150}`,
  fontWeight: 700,
  fontFamily: T.fontUi,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.ink075}`,
  color: T.ink700,
  verticalAlign: "middle",
  fontSize: "13px",
  fontFamily: T.fontUi,
};

const STATUS_CONFIG = {
  draft: { color: T.ink500, bg: T.ink075, bd: T.ink150, label: "Draft" },
  confirmed: { color: T.info, bg: T.infoBg, bd: T.infoBd, label: "Confirmed" },
  shipped: {
    color: T.accentMid,
    bg: T.accentLit,
    bd: T.accentBd,
    label: "Shipped",
  },
  delivered: {
    color: T.success,
    bg: T.successBg,
    bd: T.successBd,
    label: "Delivered",
  },
  cancelled: {
    color: T.danger,
    bg: T.dangerBg,
    bd: T.dangerBd,
    label: "Cancelled",
  },
};

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "2px 8px",
        borderRadius: "3px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.bd}`,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: T.fontUi,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const availQty = (item) =>
  Math.max(
    0,
    parseFloat(item.quantity_on_hand || 0) - parseFloat(item.reserved_qty || 0),
  );

// ── INVOICE MODAL v2.0 — SAGE-style ──────────────────────────────────────────
function InvoiceModal({ order, partner, lines, items, tenantName, onClose }) {
  const printRef = useRef();
  const invNumber = `INV-${order.po_number?.replace("WHO-", "") || order.id?.slice(0, 8).toUpperCase()}`;
  const issueDate = new Date().toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dueDate = new Date(Date.now() + 30 * 86400000).toLocaleDateString(
    "en-ZA",
    { day: "numeric", month: "long", year: "numeric" },
  );
  const subtotal = parseFloat(order.subtotal || 0);
  const vatAmt = subtotal * 0.15;
  const total = subtotal + vatAmt;

  const BRAND = {
    name: tenantName || "Pure Premium THC Vapes",
    email: "Pure@Pure.co.za",
    bank: "Pure Bank",
    account: "TBC",
    branch: "TBC",
    accType: "Current",
    vat: "VAT No. TBC",
    address: "South Africa",
  };

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>${invNumber}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;font-size:13px;background:#fff;}
        .page{max-width:794px;margin:0 auto;padding:48px;}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:24px;border-bottom:3px solid #1A3D2B;}
        .brand-name{font-size:22px;font-weight:700;color:#1A3D2B;letter-spacing:-0.02em;}
        .inv-title{font-size:28px;font-weight:300;color:#1A3D2B;text-align:right;letter-spacing:-0.02em;}
        .inv-meta{font-size:12px;color:#666;text-align:right;margin-top:6px;line-height:1.8;}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;}
        .box{background:#f8f8f6;border-radius:6px;padding:16px 18px;}
        .box-title{font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin-bottom:10px;}
        .box-name{font-size:15px;font-weight:700;color:#111;margin-bottom:4px;}
        .box-detail{font-size:12px;color:#555;line-height:1.7;}
        .accent-box{background:#e8f5ee;border-left:3px solid #1A3D2B;}
        table{width:100%;border-collapse:collapse;margin-bottom:24px;}
        thead tr{background:#1A3D2B;}
        thead th{color:#fff;padding:10px 12px;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;text-align:left;font-weight:600;}
        thead th.r{text-align:right;}
        tbody tr:nth-child(even){background:#f8f8f6;}
        td{padding:11px 12px;border-bottom:1px solid #eee;font-size:13px;color:#333;vertical-align:middle;}
        td.r{text-align:right;font-variant-numeric:tabular-nums;}
        td.name{font-weight:500;color:#111;}
        td.sku{font-size:10px;color:#999;display:block;margin-top:2px;}
        .totals{display:flex;justify-content:flex-end;margin-bottom:32px;}
        .totals-box{width:280px;}
        .tot-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#555;}
        .tot-row.final{border-bottom:none;border-top:2px solid #1A3D2B;padding-top:12px;font-size:16px;font-weight:700;color:#1A3D2B;}
        .notes{background:#f8f8f6;border-radius:6px;padding:14px 16px;font-size:12px;color:#666;line-height:1.7;margin-bottom:24px;}
        .footer{text-align:center;font-size:11px;color:#aaa;padding-top:20px;border-top:1px solid #eee;}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
      </style></head>
      <body><div class="page">${content}</div></body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Invoice ${invNumber} — ${BRAND.name}`);
    const body = encodeURIComponent(
      `Dear ${partner?.contact_name || partner?.business_name || ""},\n\nPlease find attached invoice ${invNumber} for R${total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}.\n\nPayment due: ${dueDate}\nReference: ${invNumber}\n\nBank: ${BRAND.bank}\nAccount: ${BRAND.account}\n\nThank you for your business.\n\n${BRAND.name}`,
    );
    window.open(
      `mailto:${partner?.email || ""}?subject=${subject}&body=${body}`,
    );
  };

  const toolbarBtn = (onClick, icon, label, color = T.accent) => (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        background: color,
        color: "#fff",
        border: "none",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: T.fontUi,
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </button>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 2000,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "#fff",
          borderRadius: 8,
          width: 860,
          maxWidth: "96vw",
          maxHeight: "93vh",
          overflowY: "auto",
          zIndex: 2001,
          boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
        }}
      >
        {/* ── Toolbar ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 24px",
            background: T.accent,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Tax Invoice
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
              {invNumber}
            </div>
            <div
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {order.po_status || "draft"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {toolbarBtn(handlePrint, "🖨", "Print", "#2D6A4F")}
            {toolbarBtn(handlePrint, "💾", "Save PDF", "#1E3A5F")}
            {toolbarBtn(handleEmail, "📧", "Email", "#92400E")}
            <button
              onClick={onClose}
              style={{
                padding: "8px 14px",
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: T.fontUi,
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* ── Invoice content ── */}
        <div
          ref={printRef}
          style={{ padding: "40px 48px", background: "#fff" }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 36,
              paddingBottom: 24,
              borderBottom: "3px solid #1A3D2B",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.accent,
                  letterSpacing: "-0.02em",
                  marginBottom: 4,
                }}
              >
                {BRAND.name}
              </div>
              <div style={{ fontSize: 12, color: T.ink500, lineHeight: 1.8 }}>
                <div>{BRAND.email}</div>
                <div>{BRAND.address}</div>
                <div style={{ color: T.ink400 }}>{BRAND.vat}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: T.accent,
                  letterSpacing: "-0.02em",
                  marginBottom: 8,
                }}
              >
                TAX INVOICE
              </div>
              <div style={{ fontSize: 13, color: T.ink500, lineHeight: 1.9 }}>
                <div>
                  <span style={{ color: "#6B7280" }}>Invoice No: </span>
                  <strong style={{ color: T.ink900 }}>{invNumber}</strong>
                </div>
                <div>
                  <span style={{ color: "#6B7280" }}>Order Ref: </span>
                  <strong style={{ color: T.ink900 }}>{order.po_number}</strong>
                </div>
                <div>
                  <span style={{ color: "#6B7280" }}>Issue Date: </span>
                  <strong style={{ color: T.ink900 }}>{issueDate}</strong>
                </div>
                <div>
                  <span style={{ color: "#6B7280" }}>Due Date: </span>
                  <strong style={{ color: "#92400E" }}>{dueDate}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To + Payment */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                background: T.accentLit,
                border: `1px solid ${T.accentBd}`,
                borderLeft: `4px solid ${T.accent}`,
                borderRadius: 6,
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: T.accentMid,
                  marginBottom: 10,
                }}
              >
                Bill To
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.ink900,
                  marginBottom: 6,
                }}
              >
                {partner?.business_name || "—"}
              </div>
              {partner?.contact_name && (
                <div style={{ fontSize: 12, color: T.ink500 }}>
                  {partner.contact_name}
                </div>
              )}
              {partner?.email && (
                <div style={{ fontSize: 12, color: T.ink500 }}>
                  {partner.email}
                </div>
              )}
              {partner?.phone && (
                <div style={{ fontSize: 12, color: T.ink500 }}>
                  {partner.phone}
                </div>
              )}
            </div>
            <div
              style={{
                background: T.ink075,
                border: `1px solid ${T.ink150}`,
                borderLeft: `4px solid #9CA3AF`,
                borderRadius: 6,
                padding: "18px 20px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: T.ink400,
                  marginBottom: 10,
                }}
              >
                Payment Details
              </div>
              <div style={{ fontSize: 12, color: T.ink500, lineHeight: 1.9 }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: T.ink400 }}>Bank</span>
                  <strong style={{ color: T.ink900 }}>{BRAND.bank}</strong>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: T.ink400 }}>Account</span>
                  <strong style={{ color: T.ink900 }}>{BRAND.account}</strong>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: T.ink400 }}>Branch</span>
                  <strong style={{ color: T.ink900 }}>{BRAND.branch}</strong>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: T.ink400 }}>Type</span>
                  <strong style={{ color: T.ink900 }}>{BRAND.accType}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: `1px solid ${T.ink150}`,
                  }}
                >
                  <span style={{ color: T.ink400 }}>Reference</span>
                  <strong style={{ color: T.accent }}>{invNumber}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 24,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: T.accent }}>
                {[
                  "#",
                  "Product / Description",
                  "Qty",
                  "Unit Price",
                  "VAT",
                  "Line Total",
                ].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "11px 12px",
                      fontSize: 9,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#fff",
                      fontWeight: 600,
                      textAlign: i >= 2 ? "right" : "left",
                      fontFamily: T.fontUi,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const item = items.find((it) => it.id === line.item_id);
                const qty = parseFloat(line.quantity_ordered || 0);
                const price = parseFloat(line.unit_cost || 0);
                const lineEx = qty * price;
                const lineVat = lineEx * 0.15;
                const lineTotal = lineEx + lineVat;
                return (
                  <tr
                    key={line.id || i}
                    style={{ background: i % 2 === 0 ? "#fff" : T.ink050 }}
                  >
                    <td
                      style={{
                        padding: "12px 12px",
                        borderBottom: `1px solid ${T.ink150}`,
                        fontSize: 12,
                        color: T.ink400,
                        fontFamily: T.fontUi,
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        padding: "12px 12px",
                        borderBottom: `1px solid ${T.ink150}`,
                        fontFamily: T.fontUi,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: T.ink900,
                        }}
                      >
                        {item?.name || "—"}
                      </div>
                      {item?.sku && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#6B7280",
                            marginTop: 2,
                          }}
                        >
                          SKU: {item.sku}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 12px",
                        borderBottom: `1px solid ${T.ink150}`,
                        fontSize: 13,
                        color: T.ink700,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: T.fontUi,
                      }}
                    >
                      {qty}
                    </td>
                    <td
                      style={{
                        padding: "12px 12px",
                        borderBottom: `1px solid ${T.ink150}`,
                        fontSize: 13,
                        color: T.ink700,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: T.fontUi,
                      }}
                    >
                      R
                      {price.toLocaleString("en-ZA", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      style={{
                        padding: "12px 12px",
                        borderBottom: `1px solid ${T.ink150}`,
                        fontSize: 12,
                        color: T.ink400,
                        textAlign: "right",
                        fontFamily: T.fontUi,
                      }}
                    >
                      15%
                    </td>
                    <td
                      style={{
                        padding: "12px 12px",
                        borderBottom: `1px solid ${T.ink150}`,
                        fontSize: 13,
                        fontWeight: 700,
                        color: T.ink900,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: T.fontUi,
                      }}
                    >
                      R
                      {lineTotal.toLocaleString("en-ZA", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 300,
                background: T.ink075,
                borderRadius: 6,
                padding: "16px 20px",
                border: `1px solid ${T.ink150}`,
              }}
            >
              {[
                { label: "Subtotal (excl. VAT)", value: subtotal, bold: false },
                { label: "VAT @ 15%", value: vatAmt, bold: false },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: `1px solid ${T.ink150}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: T.ink500,
                      fontFamily: T.fontUi,
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: T.ink700,
                      fontVariantNumeric: "tabular-nums",
                      fontFamily: T.fontUi,
                    }}
                  >
                    R
                    {row.value.toLocaleString("en-ZA", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 12,
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: T.accent,
                    fontFamily: T.fontUi,
                  }}
                >
                  TOTAL DUE
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: T.accent,
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: T.fontUi,
                  }}
                >
                  R{total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div
            style={{
              background: T.ink075,
              borderRadius: 6,
              padding: "14px 18px",
              marginBottom: 28,
              fontSize: 12,
              color: T.ink500,
              lineHeight: 1.7,
              fontFamily: T.fontUi,
              border: `1px solid ${T.ink150}`,
            }}
          >
            <strong style={{ color: T.ink700 }}>Terms & Notes:</strong> Payment
            due within 30 days of invoice date. Please use{" "}
            <strong style={{ color: T.accent }}>{invNumber}</strong> as your
            payment reference. Goods remain the property of {BRAND.name} until
            payment is received in full.
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              paddingTop: 20,
              borderTop: `2px solid ${T.accentLit}`,
              fontSize: 11,
              color: "#6B7280",
              fontFamily: T.fontUi,
              lineHeight: 1.8,
            }}
          >
            <div
              style={{ fontWeight: 700, color: T.accentMid, marginBottom: 2 }}
            >
              {BRAND.name}
            </div>
            <div>
              {BRAND.email} · {BRAND.vat}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: T.ink150 }}>
              Generated by Pure Premium ERP ·{" "}
              {new Date().toLocaleDateString("en-ZA")}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── CREATE ORDER FORM ─────────────────────────────────────────────────────────
function CreateOrderForm({ partners, items, onSaved, onCancel }) {
  const { tenantId } = useTenant();
  const [form, setForm] = useState({
    partner_id: "",
    notes: "",
    expected_date: "",
  });
  const [lines, setLines] = useState([
    { item_id: "", quantity_ordered: "", unit_price: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const setLine = (idx, k, v) =>
    setLines((p) => {
      const next = [...p];
      next[idx] = { ...next[idx], [k]: v };
      if (k === "item_id" && v) {
        const item = items.find((i) => i.id === v);
        if (item && !next[idx].unit_price) {
          next[idx].unit_price = (item.sell_price || 0).toFixed(2);
        }
      }
      return next;
    });
  const addLine = () =>
    setLines((p) => [
      ...p,
      { item_id: "", quantity_ordered: "", unit_price: "" },
    ]);
  const removeLine = (idx) => setLines((p) => p.filter((_, i) => i !== idx));

  const subtotal = lines.reduce((s, l) => {
    const qty = parseFloat(l.quantity_ordered) || 0;
    const price = parseFloat(l.unit_price) || 0;
    return s + qty * price;
  }, 0);

  const genOrderNum = () => {
    const d = new Date();
    return `WHO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${String(Date.now()).slice(-4)}`;
  };

  const handleSave = async () => {
    if (!form.partner_id) {
      alert("Select a wholesale partner.");
      return;
    }
    const valid = lines.filter(
      (l) => l.item_id && l.quantity_ordered && l.unit_price,
    );
    if (valid.length === 0) {
      alert("Add at least one line item.");
      return;
    }

    // Validate available qty
    for (const l of valid) {
      const item = items.find((i) => i.id === l.item_id);
      if (!item) continue;
      const avail = availQty(item);
      const qty = parseFloat(l.quantity_ordered);
      if (qty > avail) {
        alert(
          `Insufficient available stock for ${item.name}: ${avail.toFixed(0)} available, ${qty} requested.`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      const { data: po, error: poErr } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: genOrderNum(),
          direction: "outbound",
          customer_id: form.partner_id,
          po_status: "draft",
          status: "draft",
          currency: "ZAR",
          subtotal,
          notes: form.notes || null,
          expected_date: form.expected_date || null,
          order_date: new Date().toISOString().split("T")[0],
          tenant_id: tenantId,
        })
        .select()
        .single();
      if (poErr) throw poErr;

      const { error: linesErr } = await supabase
        .from("purchase_order_items")
        .insert(
          valid.map((l) => ({
            po_id: po.id,
            item_id: l.item_id,
            quantity_ordered: parseFloat(l.quantity_ordered),
            unit_cost: parseFloat(l.unit_price),
          })),
        );
      if (linesErr) throw linesErr;

      onSaved();
    } catch (err) {
      alert("Error creating order: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const lbl = (t) => (
    <label
      style={{
        fontSize: "11px",
        color: T.ink500,
        display: "block",
        marginBottom: "4px",
        fontFamily: T.fontUi,
      }}
    >
      {t}
    </label>
  );

  return (
    <div
      style={{
        ...sCard,
        marginBottom: "20px",
        borderLeft: `3px solid ${T.accent}`,
      }}
    >
      <div style={{ ...sLabel, marginBottom: "16px" }}>New Wholesale Order</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          {lbl("Wholesale Partner *")}
          <select
            style={sSelect}
            value={form.partner_id}
            onChange={(e) => set("partner_id", e.target.value)}
          >
            <option value="">— Select Partner —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.business_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          {lbl("Expected Delivery Date")}
          <input
            style={sInput}
            type="date"
            value={form.expected_date}
            onChange={(e) => set("expected_date", e.target.value)}
          />
        </div>
        <div>
          {lbl("Notes")}
          <input
            style={sInput}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Optional order notes"
          />
        </div>
      </div>

      <div style={{ ...sLabel, marginBottom: "10px" }}>Line Items</div>
      {lines.map((line, idx) => {
        const selItem = items.find((i) => i.id === line.item_id);
        const avail = selItem ? availQty(selItem) : null;
        const qty = parseFloat(line.quantity_ordered) || 0;
        const overstock = avail !== null && qty > avail;
        return (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto",
              gap: "8px",
              marginBottom: "8px",
              alignItems: "flex-end",
            }}
          >
            <div>
              {idx === 0 && lbl("Product *")}
              <select
                style={{
                  ...sSelect,
                  borderColor: overstock ? T.danger : T.ink150,
                }}
                value={line.item_id}
                onChange={(e) => setLine(idx, "item_id", e.target.value)}
              >
                <option value="">— Select Item —</option>
                {items
                  .filter(
                    (i) => i.category === "finished_product" && availQty(i) > 0,
                  )
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({availQty(i).toFixed(0)} available)
                    </option>
                  ))}
              </select>
              {overstock && (
                <div
                  style={{
                    fontSize: "10px",
                    color: T.danger,
                    marginTop: "2px",
                    fontFamily: T.fontUi,
                  }}
                >
                  Only {avail.toFixed(0)} available
                </div>
              )}
            </div>
            <div>
              {idx === 0 && lbl("Qty *")}
              <input
                style={{
                  ...sInput,
                  borderColor: overstock ? T.danger : T.ink150,
                }}
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 50"
                value={line.quantity_ordered}
                onChange={(e) =>
                  setLine(idx, "quantity_ordered", e.target.value)
                }
              />
            </div>
            <div>
              {idx === 0 && lbl("Unit Price (ZAR) *")}
              <input
                style={sInput}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 150.00"
                value={line.unit_price}
                onChange={(e) => setLine(idx, "unit_price", e.target.value)}
              />
            </div>
            {lines.length > 1 && (
              <button
                onClick={() => removeLine(idx)}
                style={{
                  ...sBtn("danger"),
                  padding: "8px 10px",
                  alignSelf: idx === 0 ? "flex-end" : "center",
                }}
              >
                ✕
              </button>
            )}
          </div>
        );
      })}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "12px",
        }}
      >
        <button
          onClick={addLine}
          style={{ ...sBtn("outline"), fontSize: "9px", padding: "6px 12px" }}
        >
          + Add Line
        </button>
        <div
          style={{
            fontFamily: T.fontData,
            fontSize: "14px",
            fontWeight: 600,
            color: T.ink900,
          }}
        >
          Subtotal: R
          {subtotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "16px",
        }}
      >
        <button onClick={onCancel} style={sBtn("outline")}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} style={sBtn()}>
          {saving ? "Creating..." : "Create Draft Order"}
        </button>
      </div>
    </div>
  );
}

// ── ORDER CARD ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  partners,
  items,
  onRefresh,
  tenantId,
  tenantName,
}) {
  const [expanded, setExpanded] = useState(false);
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const generateInvoiceRecord = async (
    orderId,
    poNumber,
    subtotal,
    partnerId,
  ) => {
    try {
      const invNumber = `INV-${poNumber?.replace("WHO-", "") || orderId?.slice(0, 8).toUpperCase()}`;
      const dueDate = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .split("T")[0];
      await supabase.from("invoices").upsert(
        {
          reference: invNumber,
          po_id: orderId,
          customer_id: partnerId,
          subtotal_zar: subtotal,
          vat_zar: subtotal * 0.15,
          total_zar: subtotal * 1.15,
          status: "pending",
          due_date: dueDate,
          tenant_id: tenantId,
          issued_date: new Date().toISOString().split("T")[0],
          notes: `Auto-generated from wholesale order ${poNumber}`,
        },
        { onConflict: "reference" },
      );
    } catch (err) {
      console.warn("[Invoice] auto-generate failed:", err.message);
    }
  };

  const partner = partners.find((p) => p.id === order.customer_id);
  const lines = order.purchase_order_items || [];
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirm = async () => {
    if (
      !window.confirm(
        `Confirm order ${order.po_number}? This will reserve stock for all line items.`,
      )
    )
      return;
    setWorking(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Reserve stock for each line item via DB function
      for (const line of lines) {
        if (!line.item_id || !line.quantity_ordered) continue;
        const { error } = await supabase.rpc("reserve_stock", {
          p_tenant_id: tenantId,
          p_item_id: line.item_id,
          p_qty: parseFloat(line.quantity_ordered),
          p_order_id: order.id,
          p_order_type: "wholesale",
          p_user_id: user?.id || null,
        });
        if (error) throw new Error(`Reserve failed for line: ${error.message}`);
      }
      // Tag reservations with channel + reference for StockChannelPanel visibility
      await supabase
        .from("stock_reservations")
        .update({ channel: "wholesale", order_reference: order.po_number })
        .eq("order_id", order.id);

      // Update order status
      const { error: upErr } = await supabase
        .from("purchase_orders")
        .update({ po_status: "confirmed", status: "confirmed" })
        .eq("id", order.id);
      if (upErr) throw upErr;
      showToast(`Order ${order.po_number} confirmed. Stock reserved.`);
      onRefresh();
    } catch (err) {
      showToast("Confirm failed: " + err.message, "error");
    } finally {
      setWorking(false);
    }
  };

  const handleShip = async () => {
    if (
      !window.confirm(
        `Mark order ${order.po_number} as shipped? This will release reservations and deduct stock.`,
      )
    )
      return;
    setWorking(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Get active reservations for this order
      const { data: reservations, error: resErr } = await supabase
        .from("stock_reservations")
        .select("*")
        .eq("order_id", order.id)
        .eq("status", "active");
      if (resErr) throw resErr;

      // Release each reservation
      for (const res of reservations || []) {
        const { error } = await supabase.rpc("release_reservation", {
          p_reservation_id: res.id,
        });
        if (error) throw new Error(`Release failed: ${error.message}`);
      }

      // Write sale_out stock movements + decrement on_hand
      for (const line of lines) {
        if (!line.item_id || !line.quantity_ordered) continue;
        const qty = parseFloat(line.quantity_ordered);

        await supabase.from("stock_movements").insert({
          item_id: line.item_id,
          quantity: -qty,
          movement_type: "sale_out",
          reference: order.po_number,
          notes: `Wholesale shipment — ${partner?.business_name || "partner"} — ${order.po_number}`,
          performed_by: user?.id || null,
        });

        const item = items.find((i) => i.id === line.item_id);
        if (item) {
          await supabase
            .from("inventory_items")
            .update({
              quantity_on_hand: Math.max(
                0,
                parseFloat(item.quantity_on_hand || 0) - qty,
              ),
            })
            .eq("id", line.item_id);
        }
      }

      // Update order status
      await supabase
        .from("purchase_orders")
        .update({ po_status: "shipped", status: "shipped" })
        .eq("id", order.id);

      // Auto-generate invoice record
      await generateInvoiceRecord(
        order.id,
        order.po_number,
        subtotal,
        order.customer_id,
      );

      showToast(`Order ${order.po_number} shipped. Invoice generated.`);
      onRefresh();
    } catch (err) {
      showToast("Ship failed: " + err.message, "error");
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = async () => {
    if (
      !window.confirm(
        `Cancel order ${order.po_number}? Any reserved stock will be released.`,
      )
    )
      return;
    setWorking(true);
    try {
      // Release any active reservations
      const { data: reservations } = await supabase
        .from("stock_reservations")
        .select("id")
        .eq("order_id", order.id)
        .eq("status", "active");

      for (const res of reservations || []) {
        await supabase.rpc("release_reservation", { p_reservation_id: res.id });
      }

      await supabase
        .from("purchase_orders")
        .update({ po_status: "cancelled", status: "cancelled" })
        .eq("id", order.id);

      showToast(`Order ${order.po_number} cancelled. Reservations released.`);
      onRefresh();
    } catch (err) {
      showToast("Cancel failed: " + err.message, "error");
    } finally {
      setWorking(false);
    }
  };

  const handleDeliver = async () => {
    await supabase
      .from("purchase_orders")
      .update({
        po_status: "delivered",
        status: "delivered",
        received_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", order.id);
    onRefresh();
  };

  const status = order.po_status || order.status || "draft";
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const subtotal = parseFloat(order.subtotal || 0);

  return (
    <div
      style={{
        ...sCard,
        borderLeft: `3px solid ${sc.color}`,
        marginBottom: "12px",
      }}
    >
      {toast && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "12px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: T.fontUi,
            background: toast.type === "error" ? T.dangerBg : T.successBg,
            color: toast.type === "error" ? T.danger : T.success,
            border: `1px solid ${toast.type === "error" ? T.dangerBd : T.successBd}`,
          }}
        >
          {toast.type === "error" ? "✗ " : "✓ "}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: T.fontData,
              fontSize: "16px",
              fontWeight: 600,
              color: T.ink900,
            }}
          >
            {order.po_number}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: T.ink500,
              marginTop: "2px",
              fontFamily: T.fontUi,
            }}
          >
            {partner?.business_name || "Unknown partner"}
            {order.expected_date && ` · Due: ${fmtDate(order.expected_date)}`}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <StatusBadge status={status} />
          <div
            style={{
              fontFamily: T.fontData,
              fontSize: "14px",
              fontWeight: 600,
              color: T.ink900,
            }}
          >
            R{subtotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </div>
          {/* Action buttons by status */}
          {status === "draft" && (
            <>
              <button
                onClick={handleConfirm}
                disabled={working}
                style={{ ...sBtn(), padding: "6px 14px", fontSize: "9px" }}
              >
                {working ? "..." : "Confirm + Reserve"}
              </button>
              <button
                onClick={handleCancel}
                disabled={working}
                style={{
                  ...sBtn("danger"),
                  padding: "6px 14px",
                  fontSize: "9px",
                }}
              >
                Cancel
              </button>
            </>
          )}
          {status === "confirmed" && (
            <>
              <button
                onClick={handleShip}
                disabled={working}
                style={{ ...sBtn(), padding: "6px 14px", fontSize: "9px" }}
              >
                {working ? "..." : "Mark Shipped"}
              </button>
              <button
                onClick={handleCancel}
                disabled={working}
                style={{
                  ...sBtn("warning"),
                  padding: "6px 14px",
                  fontSize: "9px",
                }}
              >
                Cancel
              </button>
            </>
          )}
          {status === "shipped" && (
            <button
              onClick={handleDeliver}
              disabled={working}
              style={{
                ...sBtn(),
                padding: "6px 14px",
                fontSize: "9px",
                background: T.success,
              }}
            >
              Mark Delivered
            </button>
          )}
          {["shipped", "delivered", "confirmed"].includes(status) && (
            <button
              onClick={() => setShowInvoice(true)}
              style={{
                ...sBtn("outline"),
                padding: "6px 12px",
                fontSize: "9px",
                borderColor: T.accentBd,
                color: T.accentMid,
              }}
            >
              📄 Invoice
            </button>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            style={{ ...sBtn("outline"), padding: "6px 12px", fontSize: "9px" }}
          >
            {expanded ? "▲ Hide" : "▼ Lines"}
          </button>
          {showInvoice && (
            <InvoiceModal
              order={order}
              partner={partner}
              lines={lines}
              items={items}
              tenantName={tenantName || "Pure Premium THC Vapes"}
              onClose={() => setShowInvoice(false)}
            />
          )}
        </div>
      </div>

      {/* Line items */}
      {expanded && lines.length > 0 && (
        <div
          style={{
            marginTop: "16px",
            borderTop: `1px solid ${T.ink150}`,
            paddingTop: "14px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              fontFamily: T.fontUi,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Product</th>
                <th style={{ ...sTh, textAlign: "right" }}>Qty Ordered</th>
                <th style={{ ...sTh, textAlign: "right" }}>Unit Price</th>
                <th style={{ ...sTh, textAlign: "right" }}>Line Total</th>
                <th style={{ ...sTh, textAlign: "right" }}>Available Now</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const item = items.find((it) => it.id === line.item_id);
                const lineTotal =
                  (parseFloat(line.quantity_ordered) || 0) *
                  (parseFloat(line.unit_cost) || 0);
                const avail = item ? availQty(item) : null;
                return (
                  <tr key={line.id || i}>
                    <td style={{ ...sTd, fontWeight: 500 }}>
                      {item?.name || line.item_id?.slice(0, 8) || "—"}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                      }}
                    >
                      {line.quantity_ordered}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                      }}
                    >
                      R{parseFloat(line.unit_cost || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                        fontWeight: 600,
                      }}
                    >
                      R
                      {lineTotal.toLocaleString("en-ZA", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      style={{
                        ...sTd,
                        textAlign: "right",
                        fontFamily: T.fontData,
                        color:
                          avail === null
                            ? T.ink400
                            : avail <= 0
                              ? T.danger
                              : avail < parseFloat(line.quantity_ordered || 0)
                                ? T.warning
                                : T.success,
                      }}
                    >
                      {avail === null
                        ? "—"
                        : `${avail.toFixed(0)} ${item?.unit || ""}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: T.ink075 }}>
                <td
                  colSpan={3}
                  style={{ ...sTd, fontWeight: 700, textAlign: "right" }}
                >
                  Order Total:
                </td>
                <td
                  style={{
                    ...sTd,
                    fontFamily: T.fontData,
                    fontWeight: 700,
                    textAlign: "right",
                    color: T.accent,
                  }}
                >
                  R
                  {subtotal.toLocaleString("en-ZA", {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td style={sTd} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {order.notes && (
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: T.ink500,
            fontStyle: "italic",
            fontFamily: T.fontUi,
          }}
        >
          {order.notes}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function HQWholesaleOrders() {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState("active");
  const { tenantId, tenant } = useTenant();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersR, partnersR, itemsR] = await Promise.all([
        supabase
          .from("purchase_orders")
          .select(
            "*, purchase_order_items(id, item_id, quantity_ordered, unit_cost)",
          )
          .eq("direction", "outbound")
          .order("created_at", { ascending: false }),
        supabase
          .from("wholesale_partners")
          .select("id, business_name, contact_name, email")
          .order("business_name"),
        supabase
          .from("inventory_items")
          .select(
            "id, name, sku, category, unit, quantity_on_hand, reserved_qty, sell_price, weighted_avg_cost, cost_price",
          )
          .eq("is_active", true)
          .order("name"),
      ]);
      setOrders(ordersR.data || []);
      setPartners(partnersR.data || []);
      setItems(itemsR.data || []);
    } catch (err) {
      console.error("[HQWholesaleOrders] fetchAll:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredOrders = orders.filter((o) => {
    const status = o.po_status || o.status || "draft";
    if (filterStatus === "active")
      return ["draft", "confirmed", "shipped"].includes(status);
    if (filterStatus === "completed")
      return ["delivered", "cancelled"].includes(status);
    return true;
  });

  // Stats
  const activeOrders = orders.filter((o) =>
    ["draft", "confirmed", "shipped"].includes(o.po_status || o.status),
  );
  const confirmedOrders = orders.filter(
    (o) => (o.po_status || o.status) === "confirmed",
  );
  const totalReservedValue = confirmedOrders.reduce(
    (s, o) => s + parseFloat(o.subtotal || 0),
    0,
  );
  const totalPipelineValue = activeOrders.reduce(
    (s, o) => s + parseFloat(o.subtotal || 0),
    0,
  );

  return (
    <div style={{ fontFamily: T.fontUi }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: T.accent,
              fontFamily: T.fontUi,
            }}
          >
            Wholesale Orders
          </div>
          <div style={{ fontSize: "12px", color: T.ink400, marginTop: "2px" }}>
            B2B order management · Stock reservation on confirmation · Release
            on shipment
          </div>
        </div>
        <button onClick={() => setShowCreate((p) => !p)} style={sBtn()}>
          {showCreate ? "Cancel" : "+ New Order"}
        </button>
      </div>

      {/* Stat strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          marginBottom: "20px",
        }}
      >
        {[
          {
            label: "Active Orders",
            value: activeOrders.length,
            color: T.accent,
          },
          {
            label: "Awaiting Confirm",
            value: orders.filter((o) => (o.po_status || o.status) === "draft")
              .length,
            color: T.ink500,
          },
          {
            label: "Stock Reserved",
            value: confirmedOrders.length,
            color: T.info,
          },
          {
            label: "Reserved Value",
            value: `R${totalReservedValue.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`,
            color: T.warning,
          },
          {
            label: "Pipeline Value",
            value: `R${totalPipelineValue.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`,
            color: T.success,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{ background: "#fff", padding: "16px 18px" }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: "6px",
                fontFamily: T.fontUi,
                fontWeight: 700,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: T.fontData,
                fontSize: "20px",
                fontWeight: 600,
                color: s.color,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateOrderForm
          partners={partners}
          items={items}
          tenantId={tenantId}
          onSaved={() => {
            setShowCreate(false);
            fetchAll();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {[
          { id: "active", label: "Active" },
          { id: "completed", label: "Completed" },
          { id: "all", label: "All" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id)}
            style={{
              ...sBtn("outline"),
              padding: "6px 14px",
              fontSize: "9px",
              background: filterStatus === f.id ? T.accent : "#fff",
              color: filterStatus === f.id ? "#fff" : T.accentMid,
              borderColor: filterStatus === f.id ? T.accent : T.accentBd,
            }}
          >
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={fetchAll}
          style={{ ...sBtn("outline"), fontSize: "9px", padding: "6px 12px" }}
        >
          Refresh
        </button>
      </div>

      {/* Orders */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: T.ink400,
            fontFamily: T.fontUi,
          }}
        >
          Loading orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          style={{
            ...sCard,
            textAlign: "center",
            padding: "60px",
            color: T.ink400,
            fontFamily: T.fontUi,
          }}
        >
          {filterStatus === "active"
            ? "No active wholesale orders. Create one above."
            : "No orders found."}
        </div>
      ) : (
        <div>
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              partners={partners}
              items={items}
              onRefresh={fetchAll}
              tenantId={tenantId}
              tenantName={tenant?.name}
            />
          ))}
        </div>
      )}

      {/* How it works */}
      <div
        style={{
          ...sCard,
          border: `1px solid ${T.infoBd}`,
          borderLeft: `3px solid ${T.info}`,
          marginTop: "24px",
        }}
      >
        <div style={{ ...sLabel, color: T.info, marginBottom: "12px" }}>
          How Wholesale Orders Work
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: "12px",
          }}
        >
          {[
            {
              step: "1",
              label: "Create Draft",
              desc: "Build the order with line items. Stock is not yet held.",
              color: T.ink500,
            },
            {
              step: "2",
              label: "Confirm + Reserve",
              desc: "Clicking Confirm calls reserve_stock() — available qty drops in StockControl immediately.",
              color: T.info,
            },
            {
              step: "3",
              label: "Mark Shipped",
              desc: "Releases reservations, writes sale_out movements, decrements on_hand. Stock is now physically gone.",
              color: T.accentMid,
            },
            {
              step: "4",
              label: "Mark Delivered",
              desc: "Confirms receipt by partner. Order complete.",
              color: T.success,
            },
          ].map((s) => (
            <div
              key={s.step}
              style={{
                padding: "12px 14px",
                background: T.ink075,
                border: `1px solid ${T.ink150}`,
                borderRadius: "6px",
                borderLeft: `3px solid ${s.color}`,
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: s.color,
                  marginBottom: "4px",
                  fontFamily: T.fontUi,
                }}
              >
                Step {s.step} — {s.label}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: T.ink500,
                  fontFamily: T.fontUi,
                  lineHeight: "1.6",
                }}
              >
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
