// src/components/hq/StockReceiveHistoryPanel.js v1.0
// WP-STOCK-RECEIVE S2 — Receipt history: browse, search, expand, reprint
// Reads: stock_receipts + stock_receipt_lines (written by StockReceiveModal S1)
// LL-160: tenantId as PROP — never from useTenant() directly
// LL-165: stock_receipts uses item_id FK on lines

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";
const MONO = "'DM Mono','Courier New',monospace";

const sTh = {
  textAlign: "left",
  padding: "9px 12px",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink500,
  borderBottom: `2px solid ${T.border}`,
  fontWeight: 700,
  fontFamily: T.font,
  whiteSpace: "nowrap",
  background: T.surface,
};
const sTd = {
  padding: "9px 12px",
  borderBottom: `1px solid ${T.border}`,
  fontSize: "13px",
  fontFamily: T.font,
  color: T.ink700,
  verticalAlign: "middle",
};
const sInput = {
  padding: "7px 11px",
  border: `1px solid ${T.border}`,
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: T.font,
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const fmt = (n) =>
  n == null
    ? "—"
    : "R" +
      Number(n).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const fmtQty = (n, unit) =>
  n == null
    ? "—"
    : `${Number(n).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}${unit ? " " + unit : ""}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

// ── Print receipt (mirrors StockReceiveModal Step 4 print) ──────────────────
function printReceipt(receipt, lines) {
  const total = lines.reduce(
    (s, l) =>
      s +
      parseFloat(l.quantity_received || l.quantity_ordered || 0) *
        parseFloat(l.unit_cost || 0),
    0,
  );
  const html = `
    <!DOCTYPE html><html><head><title>${receipt.reference || "RCV"}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;font-size:12px;padding:32px;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1A3D2B;}
      .ref{font-size:22px;font-weight:700;color:#1A3D2B;}
      .meta{font-size:11px;color:#666;margin-top:4px;}
      table{width:100%;border-collapse:collapse;margin:16px 0;}
      th{background:#1A3D2B;color:#fff;padding:8px 10px;font-size:10px;text-align:left;letter-spacing:0.1em;text-transform:uppercase;}
      th.r{text-align:right;}
      td{padding:9px 10px;border-bottom:1px solid #eee;font-size:12px;}
      td.r{text-align:right;font-variant-numeric:tabular-nums;}
      .total-row{background:#f8f8f6;font-weight:700;font-size:13px;}
      .avco-up{color:#92400E;font-weight:600;}
      .avco-dn{color:#166534;font-weight:600;}
      .avco-nc{color:#666;}
      .footer{margin-top:24px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:12px;}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
    </style></head><body>
    <div class="header">
      <div>
        <div class="ref">${receipt.reference || "RECEIPT"}</div>
        <div class="meta">Stock Received · ${fmtDate(receipt.received_at || receipt.created_at)}</div>
        ${receipt.supplier_name ? `<div class="meta">Supplier: ${receipt.supplier_name}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#666">Total Value</div>
        <div style="font-size:20px;font-weight:700;color:#1A3D2B">${fmt(total)}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Product</th>
        <th class="r">Qty Received</th>
        <th class="r">Unit Cost</th>
        <th class="r">Line Total</th>
        <th class="r">AVCO Before</th>
        <th class="r">AVCO After</th>
      </tr></thead>
      <tbody>
        ${lines
          .map((l) => {
            const qty = parseFloat(
              l.quantity_received || l.quantity_ordered || 0,
            );
            const cost = parseFloat(l.unit_cost || 0);
            const lineTotal = qty * cost;
            const avcoChange =
              l.avco_before && l.avco_after
                ? ((l.avco_after - l.avco_before) / l.avco_before) * 100
                : null;
            const cls =
              avcoChange == null
                ? "avco-nc"
                : avcoChange > 2
                  ? "avco-up"
                  : avcoChange < -2
                    ? "avco-dn"
                    : "avco-nc";
            return `<tr>
            <td><strong>${l.item_name || l.inventory_items?.name || "—"}</strong></td>
            <td class="r">${qty} ${l.unit || ""}</td>
            <td class="r">${fmt(cost)}</td>
            <td class="r">${fmt(lineTotal)}</td>
            <td class="r ${cls}">${l.avco_before ? fmt(l.avco_before) : "—"}</td>
            <td class="r ${cls}">${l.avco_after ? fmt(l.avco_after) : "—"}</td>
          </tr>`;
          })
          .join("")}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td colspan="3">Total Value Received</td>
          <td class="r">${fmt(total)}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
    ${receipt.notes ? `<div style="background:#f8f8f6;border-radius:4px;padding:10px 12px;font-size:11px;color:#666;margin-top:8px;"><strong>Notes:</strong> ${receipt.notes}</div>` : ""}
    <div class="footer">Generated by NuAi · ${new Date().toLocaleDateString("en-ZA")} · ${receipt.reference || ""}</div>
    </body></html>
  `;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}

// ── AVCO diff badge ──────────────────────────────────────────────────────────
function AVCODiff({ before, after }) {
  if (!before || !after)
    return <span style={{ color: T.ink300, fontSize: 11 }}>—</span>;
  const pct = ((after - before) / before) * 100;
  if (Math.abs(pct) < 0.5)
    return (
      <span style={{ color: T.ink500, fontSize: 11, fontFamily: MONO }}>
        no change
      </span>
    );
  const up = pct > 0;
  return (
    <span
      style={{
        fontSize: 11,
        fontFamily: MONO,
        fontWeight: 700,
        color: up ? T.warning : T.success,
      }}
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
      <span style={{ fontWeight: 400, color: T.ink500, marginLeft: 4 }}>
        ({fmt(before)} → {fmt(after)})
      </span>
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StockReceiveHistoryPanel({ tenantId, onReviewPrices }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null); // receipt id
  const [lineCache, setLineCache] = useState({}); // { receiptId: lines[] }
  const [linesLoading, setLinesLoading] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from("stock_receipts")
        .select("*") // suppliers(name) removed — no FK in PostgREST schema (406 fix)
        .eq("tenant_id", tenantId)
        .order("received_at", { ascending: false })
        .limit(100);
      if (e) throw e;

      // Enrich with line counts — separate query, no FK join needed
      const rows = data || [];
      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        const { data: lineRows } = await supabase
          .from("stock_receipt_lines")
          .select("receipt_id")
          .in("receipt_id", ids);
        const countMap = {};
        (lineRows || []).forEach((l) => {
          countMap[l.receipt_id] = (countMap[l.receipt_id] || 0) + 1;
        });
        setReceipts(
          rows.map((r) => ({ ...r, _line_count: countMap[r.id] || 0 })),
        );
      } else {
        setReceipts([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadLines = async (receiptId) => {
    if (lineCache[receiptId]) return;
    setLinesLoading(true);
    try {
      // Fetch lines without FK join to avoid 406 if FK not in PostgREST schema
      const { data: lines, error: e } = await supabase
        .from("stock_receipt_lines")
        .select("*")
        .eq("receipt_id", receiptId)
        .order("created_at", { ascending: true });
      if (e) throw e;
      // Enrich with item names via separate lookup
      const itemIds = [
        ...new Set((lines || []).map((l) => l.item_id).filter(Boolean)),
      ];
      let itemMap = {};
      if (itemIds.length > 0) {
        const { data: itemRows } = await supabase
          .from("inventory_items")
          .select("id, name, sku, unit")
          .in("id", itemIds);
        (itemRows || []).forEach((i) => {
          itemMap[i.id] = i;
        });
      }
      const enriched = (lines || []).map((l) => ({
        ...l,
        inventory_items: itemMap[l.item_id] || null,
      }));
      setLineCache((prev) => ({ ...prev, [receiptId]: enriched }));
    } catch (err) {
      setLineCache((prev) => ({ ...prev, [receiptId]: [] }));
    } finally {
      setLinesLoading(false);
    }
  };

  const toggleExpand = (id) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    loadLines(id);
  };

  const filtered = receipts.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.reference || "").toLowerCase().includes(q) ||
      (r.supplier_name || r.suppliers?.name || "").toLowerCase().includes(q)
    );
  });

  // KPI strip
  const totalReceived = receipts.length;
  const totalValue = receipts.reduce(
    (s, r) => s + parseFloat(r.total_value_zar || 0),
    0,
  );
  const last30 = receipts.filter(
    (r) =>
      new Date(r.received_at || r.created_at) >
      new Date(Date.now() - 30 * 86400000),
  ).length;

  if (error)
    return (
      <div
        style={{
          background: T.dangerLight,
          border: `1px solid ${T.dangerBd}`,
          borderRadius: 6,
          padding: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.danger,
            marginBottom: 6,
            fontFamily: T.font,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Failed to load receipts
        </div>
        <div
          style={{
            fontSize: 12,
            color: T.danger,
            fontFamily: T.font,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.ink500,
            fontFamily: T.font,
            marginBottom: 10,
          }}
        >
          This may mean the <code>stock_receipts</code> table doesn't exist yet.
          Confirm at least one delivery has been received via the 📦 Receive
          Delivery button.
        </div>
        <button
          onClick={load}
          style={{
            padding: "6px 14px",
            background: T.accentMid,
            color: "#fff",
            border: "none",
            borderRadius: 3,
            cursor: "pointer",
            fontSize: 11,
            fontFamily: T.font,
          }}
        >
          Retry
        </button>
      </div>
    );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header + search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.font }}>
          {loading
            ? "Loading..."
            : `${filtered.length} receipt${filtered.length !== 1 ? "s" : ""}`}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by RCV ref or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...sInput, width: 260 }}
          />
          <button
            onClick={load}
            style={{
              padding: "7px 14px",
              border: `1px solid ${T.border}`,
              borderRadius: 3,
              background: "transparent",
              color: T.ink500,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: T.font,
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1px",
          background: T.border,
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${T.border}`,
        }}
      >
        {[
          { label: "Total Receipts", value: totalReceived, color: T.border },
          { label: "Receipts This Month", value: last30, color: T.accentMid },
          {
            label: "Total Value Received",
            value: fmt(totalValue),
            color: T.border,
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: "#fff",
              padding: "14px 18px",
              borderTop: `3px solid ${k.color}`,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 400,
                color: T.ink900,
                fontFamily: MONO,
                lineHeight: 1,
                marginBottom: 4,
                letterSpacing: "-0.02em",
              }}
            >
              {k.value}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: T.ink500,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontFamily: T.font,
              }}
            >
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Receipts table */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: T.ink300,
            fontSize: 13,
            fontFamily: T.font,
          }}
        >
          Loading receipts…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            padding: "48px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>📦</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: T.ink700,
              fontFamily: T.font,
              marginBottom: 6,
            }}
          >
            {search
              ? "No receipts match your search"
              : "No deliveries received yet"}
          </div>
          <div style={{ fontSize: 12, color: T.ink500, fontFamily: T.font }}>
            {search
              ? "Clear the search to see all receipts."
              : "Use the 📦 Receive Delivery button to log your first delivery."}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            overflow: "hidden",
            boxShadow: T.shadow.sm,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: T.font,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>RCV Reference</th>
                <th style={sTh}>Supplier</th>
                <th style={sTh}>Date</th>
                <th style={{ ...sTh, textAlign: "right" }}>Items</th>
                <th style={{ ...sTh, textAlign: "right" }}>Total Value</th>
                <th style={{ ...sTh, textAlign: "center" }}>AVCO Changes</th>
                <th style={sTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const lines = lineCache[r.id] || [];
                const isOpen = expanded === r.id;
                const supplierName =
                  r.supplier_name || r.suppliers?.name || "—";
                const avcoChangedCount = lines.filter((l) => {
                  if (!l.avco_before || !l.avco_after) return false;
                  return (
                    Math.abs((l.avco_after - l.avco_before) / l.avco_before) >
                    0.02
                  );
                }).length;

                return (
                  <React.Fragment key={r.id}>
                    <tr
                      style={{
                        background: isOpen
                          ? T.accentLight
                          : idx % 2 === 0
                            ? "#fff"
                            : T.surface,
                        cursor: "pointer",
                      }}
                      onClick={() => toggleExpand(r.id)}
                    >
                      {/* RCV Reference */}
                      <td
                        style={{
                          ...sTd,
                          fontFamily: MONO,
                          fontWeight: 700,
                          color: T.accentMid,
                        }}
                      >
                        {r.reference || r.id?.slice(0, 8)}
                      </td>

                      {/* Supplier */}
                      <td style={{ ...sTd }}>
                        <span style={{ fontSize: 13, color: T.ink700 }}>
                          {supplierName}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ ...sTd, whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: 12, color: T.ink700 }}>
                          {fmtDate(r.received_at || r.created_at)}
                        </div>
                        <div style={{ fontSize: 10, color: T.ink500 }}>
                          {fmtTime(r.received_at || r.created_at)}
                        </div>
                      </td>

                      {/* Item count */}
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: MONO,
                          color: T.ink500,
                        }}
                      >
                        {r._line_count || (isOpen ? lines.length : "—")}
                      </td>

                      {/* Total value */}
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: MONO,
                          fontWeight: 700,
                          color: T.ink900,
                        }}
                      >
                        {fmt(r.total_value_zar)}
                      </td>

                      {/* AVCO changes badge */}
                      <td style={{ ...sTd, textAlign: "center" }}>
                        {!isOpen ? (
                          <span
                            style={{
                              fontSize: 11,
                              color: T.ink300,
                              fontFamily: T.font,
                            }}
                          >
                            expand to view
                          </span>
                        ) : linesLoading ? (
                          <span style={{ fontSize: 11, color: T.ink300 }}>
                            loading…
                          </span>
                        ) : avcoChangedCount > 0 ? (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 3,
                              background: T.warningLight,
                              color: T.warning,
                              border: `1px solid ${T.warningBd}`,
                              fontWeight: 700,
                              fontFamily: T.font,
                            }}
                          >
                            {avcoChangedCount} changed
                          </span>
                        ) : isOpen ? (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 3,
                              background: T.successLight,
                              color: T.success,
                              border: `1px solid ${T.successBd}`,
                              fontWeight: 700,
                              fontFamily: T.font,
                            }}
                          >
                            no changes
                          </span>
                        ) : null}
                      </td>

                      {/* Actions */}
                      <td
                        style={{ ...sTd, whiteSpace: "nowrap" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: "flex", gap: 5 }}>
                          <button
                            onClick={() => toggleExpand(r.id)}
                            style={{
                              padding: "3px 8px",
                              fontSize: 10,
                              fontFamily: T.font,
                              fontWeight: 600,
                              border: `1px solid ${T.accentBd}`,
                              color: T.accentMid,
                              background: "transparent",
                              borderRadius: 3,
                              cursor: "pointer",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {isOpen ? "Close" : "View"}
                          </button>
                          <button
                            onClick={() => {
                              if (!lineCache[r.id]) {
                                loadLines(r.id).then(() =>
                                  printReceipt(r, lineCache[r.id] || []),
                                );
                              } else {
                                printReceipt(r, lineCache[r.id]);
                              }
                            }}
                            style={{
                              padding: "3px 8px",
                              fontSize: 10,
                              fontFamily: T.font,
                              fontWeight: 600,
                              border: `1px solid ${T.border}`,
                              color: T.ink500,
                              background: "transparent",
                              borderRadius: 3,
                              cursor: "pointer",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            🖨 Print
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded line items */}
                    {isOpen && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: 0,
                            borderBottom: `2px solid ${T.accentBd}`,
                          }}
                        >
                          <div
                            style={{
                              background: T.accentLight,
                              padding: "16px 20px",
                            }}
                          >
                            {linesLoading && !lineCache[r.id] ? (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: T.ink500,
                                  fontFamily: T.font,
                                }}
                              >
                                Loading line items…
                              </div>
                            ) : (lineCache[r.id] || []).length === 0 ? (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: T.ink500,
                                  fontFamily: T.font,
                                }}
                              >
                                No line items found for this receipt.
                              </div>
                            ) : (
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: 12,
                                  fontFamily: T.font,
                                }}
                              >
                                <thead>
                                  <tr>
                                    {[
                                      "Product",
                                      "SKU",
                                      "Qty Received",
                                      "Unit Cost",
                                      "Line Total",
                                      "AVCO Before",
                                      "AVCO After",
                                      "Change",
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        style={{
                                          ...sTh,
                                          fontSize: 9,
                                          padding: "7px 10px",
                                          background: "rgba(255,255,255,0.5)",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(lineCache[r.id] || []).map((l, li) => {
                                    const name =
                                      l.item_name ||
                                      l.inventory_items?.name ||
                                      "—";
                                    const sku = l.inventory_items?.sku || "—";
                                    const unit =
                                      l.unit || l.inventory_items?.unit || "";
                                    const qty = parseFloat(
                                      l.quantity_received ||
                                        l.quantity_ordered ||
                                        0,
                                    );
                                    const cost = parseFloat(l.unit_cost || 0);
                                    const lineTotal = qty * cost;
                                    return (
                                      <tr
                                        key={l.id || li}
                                        style={{
                                          background:
                                            li % 2 === 0
                                              ? "rgba(255,255,255,0.7)"
                                              : "rgba(255,255,255,0.3)",
                                        }}
                                      >
                                        <td
                                          style={{
                                            ...sTd,
                                            fontWeight: 600,
                                            color: T.ink700,
                                            background: "transparent",
                                          }}
                                        >
                                          {name}
                                        </td>
                                        <td
                                          style={{
                                            ...sTd,
                                            fontFamily: MONO,
                                            fontSize: 11,
                                            color: T.ink500,
                                            background: "transparent",
                                          }}
                                        >
                                          {sku}
                                        </td>
                                        <td
                                          style={{
                                            ...sTd,
                                            fontFamily: MONO,
                                            fontWeight: 600,
                                            background: "transparent",
                                          }}
                                        >
                                          {fmtQty(qty, unit)}
                                        </td>
                                        <td
                                          style={{
                                            ...sTd,
                                            fontFamily: MONO,
                                            background: "transparent",
                                          }}
                                        >
                                          {fmt(cost)}
                                        </td>
                                        <td
                                          style={{
                                            ...sTd,
                                            fontFamily: MONO,
                                            fontWeight: 700,
                                            color: T.ink700,
                                            background: "transparent",
                                          }}
                                        >
                                          {fmt(lineTotal)}
                                        </td>
                                        <td
                                          style={{
                                            ...sTd,
                                            fontFamily: MONO,
                                            color: T.ink500,
                                            background: "transparent",
                                          }}
                                        >
                                          {l.avco_before
                                            ? fmt(l.avco_before)
                                            : "—"}
                                        </td>
                                        <td
                                          style={{
                                            ...sTd,
                                            fontFamily: MONO,
                                            color: T.ink500,
                                            background: "transparent",
                                          }}
                                        >
                                          {l.avco_after
                                            ? fmt(l.avco_after)
                                            : "—"}
                                        </td>
                                        <td
                                          style={{
                                            ...sTd,
                                            background: "transparent",
                                          }}
                                        >
                                          <AVCODiff
                                            before={l.avco_before}
                                            after={l.avco_after}
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr
                                    style={{
                                      background: "rgba(255,255,255,0.6)",
                                    }}
                                  >
                                    <td
                                      colSpan={4}
                                      style={{
                                        ...sTd,
                                        fontWeight: 700,
                                        textAlign: "right",
                                        background: "transparent",
                                        fontSize: 12,
                                      }}
                                    >
                                      Total Received Value:
                                    </td>
                                    <td
                                      style={{
                                        ...sTd,
                                        fontFamily: MONO,
                                        fontWeight: 700,
                                        color: T.accentMid,
                                        background: "transparent",
                                      }}
                                    >
                                      {fmt(
                                        (lineCache[r.id] || []).reduce(
                                          (s, l) =>
                                            s +
                                            parseFloat(
                                              l.quantity_received ||
                                                l.quantity_ordered ||
                                                0,
                                            ) *
                                              parseFloat(l.unit_cost || 0),
                                          0,
                                        ),
                                      )}
                                    </td>
                                    <td
                                      colSpan={3}
                                      style={{
                                        ...sTd,
                                        background: "transparent",
                                      }}
                                    >
                                      {avcoChangedCount > 0 &&
                                        onReviewPrices && (
                                          <button
                                            onClick={() =>
                                              onReviewPrices(lineCache[r.id])
                                            }
                                            style={{
                                              padding: "4px 12px",
                                              fontSize: 10,
                                              fontFamily: T.font,
                                              fontWeight: 700,
                                              border: "none",
                                              color: "#fff",
                                              background: T.warning,
                                              borderRadius: 3,
                                              cursor: "pointer",
                                              letterSpacing: "0.06em",
                                              textTransform: "uppercase",
                                            }}
                                          >
                                            Review Affected Prices →
                                          </button>
                                        )}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}
                            {r.notes && (
                              <div
                                style={{
                                  marginTop: 10,
                                  padding: "8px 12px",
                                  background: "rgba(255,255,255,0.6)",
                                  borderRadius: 4,
                                  fontSize: 12,
                                  color: T.ink500,
                                  fontFamily: T.font,
                                  fontStyle: "italic",
                                }}
                              >
                                Notes: {r.notes}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
