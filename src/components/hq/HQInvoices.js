// src/components/hq/HQInvoices.js
// WP-GEN Session 4: Invoice management UI
// Tables: invoices, invoice_line_items

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

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
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};

const sCard = {
  background: "#fff",
  border: `1px solid ${T.ink150}`,
  borderRadius: "6px",
  padding: "20px",
  boxShadow: T.shadow,
};
const sBtn = (v = "primary") => ({
  padding: "8px 16px",
  background:
    v === "primary" ? T.accent : v === "danger" ? T.danger : "transparent",
  color: ["primary", "danger"].includes(v) ? "#fff" : T.accentMid,
  border: ["primary", "danger"].includes(v)
    ? "none"
    : `1px solid ${T.accentBd}`,
  borderRadius: "4px",
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: T.font,
  transition: "all 0.15s",
});
const sInput = {
  padding: "8px 12px",
  border: `1px solid ${T.ink150}`,
  borderRadius: "4px",
  fontSize: "13px",
  fontFamily: T.font,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
const sSelect = { ...sInput, cursor: "pointer" };
const sLabel = {
  fontSize: "10px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: T.ink400,
  marginBottom: "6px",
  fontFamily: T.font,
  fontWeight: 700,
};
const sTh = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "9px",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: T.ink400,
  borderBottom: `2px solid ${T.ink150}`,
  fontWeight: 700,
};
const sTd = {
  padding: "10px 12px",
  borderBottom: `1px solid ${T.ink075}`,
  color: T.ink700,
  verticalAlign: "middle",
};

const STATUS_MAP = {
  draft: { bg: T.ink075, color: T.ink500, label: "Draft" },
  pending: { bg: T.warningBg, color: T.warning, label: "Pending" },
  paid: { bg: T.successBg, color: T.success, label: "Paid" },
  overdue: { bg: T.dangerBg, color: T.danger, label: "Overdue" },
  cancelled: { bg: T.ink075, color: T.ink400, label: "Cancelled" },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <span
      style={{
        fontSize: "9px",
        padding: "2px 8px",
        borderRadius: "3px",
        background: s.bg,
        color: s.color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: T.font,
      }}
    >
      {s.label}
    </span>
  );
}

function fmt(n) {
  return n != null
    ? `R${parseFloat(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString("en-ZA") : "—";
}
function isOverdue(inv) {
  if (inv.status === "paid" || inv.status === "cancelled") return false;
  if (!inv.due_date) return false;
  return new Date(inv.due_date) < new Date();
}

export default function HQInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [lineItems, setLineItems] = useState({});
  const [lineLoading, setLineLoading] = useState(null);
  const [paying, setPaying] = useState(null);
  const [payRef, setPayRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invR, supR] = await Promise.all([
        supabase
          .from("invoices")
          .select(
            "id,invoice_number,invoice_type,po_id,supplier_id,invoice_date,due_date,currency,subtotal,vat_amount,total_amount,status,payment_date,payment_reference,notes",
          )
          .order("invoice_date", { ascending: false })
          .limit(200),
        supabase.from("wholesale_partners").select("id,business_name"),
      ]);
      if (invR.error) throw invR.error;
      // Mark overdue client-side
      const data = (invR.data || []).map((inv) => ({
        ...inv,
        status: isOverdue(inv) ? "overdue" : inv.status,
      }));
      setInvoices(data);
      setSuppliers(supR.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchLineItems = async (invoiceId) => {
    if (lineItems[invoiceId]) return;
    setLineLoading(invoiceId);
    try {
      const { data, error } = await supabase
        .from("invoice_line_items")
        .select(
          "id,description,quantity,unit_price,discount_pct,line_total,vat_applicable,licence_number,batch_reference,inventory_item_id,inventory_items(name,sku)",
        )
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setLineItems((p) => ({ ...p, [invoiceId]: data || [] }));
    } catch (err) {
      showToast("Failed to load line items: " + err.message, "error");
    } finally {
      setLineLoading(null);
    }
  };

  const handleExpand = (id) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    fetchLineItems(id);
  };

  const handleMarkPaid = async (inv) => {
    if (!payRef.trim()) {
      showToast("Enter a payment reference before saving.", "error");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          payment_date: new Date().toISOString().split("T")[0],
          payment_reference: payRef.trim(),
        })
        .eq("id", inv.id);
      if (error) throw error;
      setPaying(null);
      setPayRef("");
      showToast(`Invoice ${inv.invoice_number} marked paid.`);
      fetchAll();
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const supName = (id) =>
    suppliers.find((s) => s.id === id)?.business_name || id?.slice(0, 8) || "—";

  const filtered =
    filter === "all"
      ? invoices
      : filter === "outstanding"
        ? invoices.filter((i) =>
            ["pending", "overdue", "draft"].includes(i.status),
          )
        : invoices.filter((i) => i.status === filter);

  const totalOutstanding = invoices
    .filter((i) => ["pending", "overdue"].includes(i.status))
    .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const totalPaidMonth = invoices
    .filter((i) => {
      if (i.status !== "paid" || !i.payment_date) return false;
      const d = new Date(i.payment_date);
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const pendingCount = invoices.filter((i) => i.status === "pending").length;

  const FILTERS = [
    { id: "all", label: `All (${invoices.length})` },
    {
      id: "outstanding",
      label: `Outstanding (${pendingCount + overdueCount})`,
      alert: overdueCount > 0,
    },
    {
      id: "overdue",
      label: `Overdue (${overdueCount})`,
      alert: overdueCount > 0,
    },
    { id: "pending", label: `Pending (${pendingCount})` },
    {
      id: "paid",
      label: `Paid (${invoices.filter((i) => i.status === "paid").length})`,
    },
    {
      id: "draft",
      label: `Draft (${invoices.filter((i) => i.status === "draft").length})`,
    },
  ];

  if (loading)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px",
          color: T.ink500,
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: `2px solid ${T.ink150}`,
            borderTopColor: T.accent,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        Loading invoices...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          ...sCard,
          border: `1px solid ${T.dangerBd}`,
          borderLeft: `3px solid ${T.danger}`,
        }}
      >
        <div style={sLabel}>Error</div>
        <p
          style={{
            fontSize: "13px",
            color: T.danger,
            margin: "8px 0 0",
            fontFamily: T.font,
          }}
        >
          {error}
        </p>
        <button onClick={fetchAll} style={{ ...sBtn(), marginTop: "12px" }}>
          Retry
        </button>
      </div>
    );

  return (
    <div style={{ fontFamily: T.font, display: "grid", gap: "20px" }}>
      {toast && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: T.font,
            fontWeight: 500,
            background: toast.type === "error" ? T.dangerBg : T.successBg,
            color: toast.type === "error" ? T.danger : T.success,
            border: `1px solid ${toast.type === "error" ? T.dangerBd : T.successBd}`,
          }}
        >
          {toast.type === "error" ? "✗ " : "✓ "}
          {toast.msg}
        </div>
      )}

      {/* Metric strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
          gap: "1px",
          background: T.ink150,
          borderRadius: "6px",
          overflow: "hidden",
          border: `1px solid ${T.ink150}`,
          boxShadow: T.shadow,
        }}
      >
        {[
          { label: "Total Invoices", value: invoices.length, color: T.ink900 },
          {
            label: "Outstanding",
            value: fmt(totalOutstanding),
            color: pendingCount > 0 ? T.warning : T.ink900,
          },
          {
            label: "Overdue",
            value: overdueCount,
            color: overdueCount > 0 ? T.danger : T.ink900,
          },
          {
            label: "Paid This Month",
            value: fmt(totalPaidMonth),
            color: T.success,
          },
        ].map((m) => (
          <div
            key={m.label}
            style={{ background: "#fff", padding: "16px 18px" }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: T.ink400,
                marginBottom: "6px",
                fontFamily: T.font,
                fontWeight: 700,
              }}
            >
              {m.label}
            </div>
            <div
              style={{
                fontFamily: T.font,
                fontSize: "22px",
                fontWeight: 400,
                color: m.color,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div
          style={{
            background: T.dangerBg,
            border: `1px solid ${T.dangerBd}`,
            borderRadius: "6px",
            padding: "14px 18px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: T.danger,
              fontFamily: T.font,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {overdueCount} invoice{overdueCount > 1 ? "s" : ""} overdue — action
            required
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 14px",
              background: filter === f.id ? T.accent : "#fff",
              color: filter === f.id ? "#fff" : f.alert ? T.danger : T.ink500,
              border: `1px solid ${filter === f.id ? T.accent : f.alert ? T.dangerBd : T.ink150}`,
              borderRadius: "4px",
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: T.font,
              fontWeight: filter === f.id ? 700 : 400,
            }}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={fetchAll}
          style={{
            ...sBtn("outline"),
            padding: "6px 12px",
            fontSize: "9px",
            marginLeft: "auto",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Invoice list */}
      <div style={sCard}>
        {filtered.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "60px", color: T.ink500 }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🧾</div>
            <p style={{ fontFamily: T.font, fontSize: "14px" }}>
              No invoices found.
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
              fontFamily: T.font,
            }}
          >
            <thead>
              <tr>
                <th style={sTh}>Invoice #</th>
                <th style={sTh}>Type</th>
                <th style={sTh}>Supplier</th>
                <th style={sTh}>Invoice Date</th>
                <th style={sTh}>Due Date</th>
                <th style={{ ...sTh, textAlign: "right" }}>Subtotal</th>
                <th style={{ ...sTh, textAlign: "right" }}>VAT</th>
                <th style={{ ...sTh, textAlign: "right" }}>Total</th>
                <th style={sTh}>Status</th>
                <th style={sTh}>PO Link</th>
                <th style={sTh}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const isOpen = expanded === inv.id;
                const isPaying = paying === inv.id;
                const lines = lineItems[inv.id] || [];
                return (
                  <React.Fragment key={inv.id}>
                    <tr
                      style={{
                        background: isOpen
                          ? T.accentLit
                          : inv.status === "overdue"
                            ? T.dangerBg
                            : "transparent",
                      }}
                    >
                      <td
                        style={{
                          ...sTd,
                          fontFamily: T.font,
                          fontWeight: 600,
                          color: T.accent,
                        }}
                      >
                        {inv.invoice_number || inv.id.slice(0, 8)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: T.ink500,
                          textTransform: "capitalize",
                        }}
                      >
                        {inv.invoice_type || "—"}
                      </td>
                      <td style={sTd}>{supName(inv.supplier_id)}</td>
                      <td style={{ ...sTd, color: T.ink500, fontSize: "11px" }}>
                        {fmtDate(inv.invoice_date)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          color: inv.status === "overdue" ? T.danger : T.ink500,
                          fontWeight: inv.status === "overdue" ? 600 : 400,
                        }}
                      >
                        {fmtDate(inv.due_date)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.font,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmt(inv.subtotal)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.font,
                          fontVariantNumeric: "tabular-nums",
                          color: T.ink500,
                        }}
                      >
                        {fmt(inv.vat_amount)}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          fontFamily: T.font,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmt(inv.total_amount)}
                      </td>
                      <td style={sTd}>
                        <StatusBadge status={inv.status} />
                      </td>
                      <td
                        style={{
                          ...sTd,
                          fontSize: "11px",
                          fontFamily: T.font,
                          color: T.ink500,
                        }}
                      >
                        {inv.po_id ? (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "3px",
                              background: T.infoBg,
                              color: T.info,
                              fontWeight: 600,
                            }}
                          >
                            PO linked
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        style={{
                          ...sTd,
                          textAlign: "right",
                          display: "flex",
                          gap: 4,
                          justifyContent: "flex-end",
                        }}
                      >
                        {inv.status !== "paid" &&
                          inv.status !== "cancelled" && (
                            <button
                              onClick={() => {
                                setPaying(isPaying ? null : inv.id);
                                setPayRef("");
                              }}
                              style={{
                                ...sBtn(isPaying ? "outline" : "primary"),
                                padding: "4px 10px",
                                fontSize: "9px",
                              }}
                            >
                              {isPaying ? "✕" : "Pay"}
                            </button>
                          )}
                        <button
                          onClick={() => handleExpand(inv.id)}
                          style={{
                            ...sBtn("outline"),
                            padding: "4px 10px",
                            fontSize: "9px",
                          }}
                        >
                          {isOpen ? "▲" : "▼"}
                        </button>
                      </td>
                    </tr>

                    {/* Payment recording inline row */}
                    {isPaying && (
                      <tr>
                        <td
                          colSpan={11}
                          style={{
                            padding: "12px 16px",
                            background: T.accentLit,
                            borderBottom: `1px solid ${T.accentBd}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "12px",
                              alignItems: "flex-end",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ flex: "1 1 280px" }}>
                              <label style={{ ...sLabel, marginBottom: 4 }}>
                                Bank / EFT Reference *
                              </label>
                              <input
                                style={{ ...sInput, maxWidth: "360px" }}
                                placeholder="e.g. FNB EFT 2026/03/21 REF12345"
                                value={payRef}
                                onChange={(e) => setPayRef(e.target.value)}
                              />
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => handleMarkPaid(inv)}
                                disabled={saving}
                                style={{ ...sBtn(), padding: "8px 20px" }}
                              >
                                {saving
                                  ? "Saving..."
                                  : `Mark Paid — ${fmt(inv.total_amount)}`}
                              </button>
                              <button
                                onClick={() => {
                                  setPaying(null);
                                  setPayRef("");
                                }}
                                style={{
                                  ...sBtn("outline"),
                                  padding: "8px 14px",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          {inv.payment_reference && (
                            <p
                              style={{
                                fontSize: "11px",
                                color: T.ink500,
                                margin: "8px 0 0",
                                fontFamily: T.font,
                              }}
                            >
                              Last reference: {inv.payment_reference}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}

                    {/* Line items detail */}
                    {isOpen && (
                      <tr>
                        <td
                          colSpan={11}
                          style={{
                            padding: "0 0 0 32px",
                            background: T.ink050,
                            borderBottom: `1px solid ${T.ink150}`,
                          }}
                        >
                          <div style={{ padding: "16px 16px 16px 0" }}>
                            {lineLoading === inv.id ? (
                              <p
                                style={{
                                  fontSize: "12px",
                                  color: T.ink500,
                                  fontFamily: T.font,
                                }}
                              >
                                Loading line items...
                              </p>
                            ) : lines.length === 0 ? (
                              <p
                                style={{
                                  fontSize: "12px",
                                  color: T.ink500,
                                  fontFamily: T.font,
                                }}
                              >
                                No line items recorded.
                              </p>
                            ) : (
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: "11px",
                                  fontFamily: T.font,
                                }}
                              >
                                <thead>
                                  <tr>
                                    <th
                                      style={{
                                        ...sTh,
                                        fontSize: "9px",
                                        padding: "6px 10px",
                                      }}
                                    >
                                      Description
                                    </th>
                                    <th
                                      style={{
                                        ...sTh,
                                        fontSize: "9px",
                                        padding: "6px 10px",
                                      }}
                                    >
                                      SKU
                                    </th>
                                    <th
                                      style={{
                                        ...sTh,
                                        fontSize: "9px",
                                        padding: "6px 10px",
                                        textAlign: "right",
                                      }}
                                    >
                                      Qty
                                    </th>
                                    <th
                                      style={{
                                        ...sTh,
                                        fontSize: "9px",
                                        padding: "6px 10px",
                                        textAlign: "right",
                                      }}
                                    >
                                      Unit Price
                                    </th>
                                    <th
                                      style={{
                                        ...sTh,
                                        fontSize: "9px",
                                        padding: "6px 10px",
                                        textAlign: "right",
                                      }}
                                    >
                                      Disc %
                                    </th>
                                    <th
                                      style={{
                                        ...sTh,
                                        fontSize: "9px",
                                        padding: "6px 10px",
                                        textAlign: "right",
                                      }}
                                    >
                                      Line Total
                                    </th>
                                    <th
                                      style={{
                                        ...sTh,
                                        fontSize: "9px",
                                        padding: "6px 10px",
                                      }}
                                    >
                                      VAT
                                    </th>
                                    <th
                                      style={{
                                        ...sTh,
                                        fontSize: "9px",
                                        padding: "6px 10px",
                                      }}
                                    >
                                      Batch Ref
                                    </th>
                                    <th
                                      style={{
                                        ...sTh,
                                        fontSize: "9px",
                                        padding: "6px 10px",
                                      }}
                                    >
                                      Licence #
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map((l) => (
                                    <tr key={l.id}>
                                      <td
                                        style={{
                                          ...sTd,
                                          padding: "8px 10px",
                                          fontWeight: 500,
                                        }}
                                      >
                                        {l.description ||
                                          l.inventory_items?.name ||
                                          "—"}
                                      </td>
                                      <td
                                        style={{
                                          ...sTd,
                                          padding: "8px 10px",
                                          fontSize: "10px",
                                          color: T.ink500,
                                          fontFamily: T.font,
                                        }}
                                      >
                                        {l.inventory_items?.sku || "—"}
                                      </td>
                                      <td
                                        style={{
                                          ...sTd,
                                          padding: "8px 10px",
                                          textAlign: "right",
                                          fontFamily: T.font,
                                          fontVariantNumeric: "tabular-nums",
                                        }}
                                      >
                                        {parseFloat(l.quantity || 0).toFixed(2)}
                                      </td>
                                      <td
                                        style={{
                                          ...sTd,
                                          padding: "8px 10px",
                                          textAlign: "right",
                                          fontFamily: T.font,
                                          fontVariantNumeric: "tabular-nums",
                                        }}
                                      >
                                        {fmt(l.unit_price)}
                                      </td>
                                      <td
                                        style={{
                                          ...sTd,
                                          padding: "8px 10px",
                                          textAlign: "right",
                                          color: T.ink500,
                                        }}
                                      >
                                        {l.discount_pct
                                          ? `${parseFloat(l.discount_pct).toFixed(1)}%`
                                          : "—"}
                                      </td>
                                      <td
                                        style={{
                                          ...sTd,
                                          padding: "8px 10px",
                                          textAlign: "right",
                                          fontFamily: T.font,
                                          fontWeight: 600,
                                          fontVariantNumeric: "tabular-nums",
                                        }}
                                      >
                                        {fmt(l.line_total)}
                                      </td>
                                      <td
                                        style={{ ...sTd, padding: "8px 10px" }}
                                      >
                                        {l.vat_applicable ? (
                                          <span
                                            style={{
                                              fontSize: "9px",
                                              padding: "1px 6px",
                                              borderRadius: "3px",
                                              background: T.infoBg,
                                              color: T.info,
                                              fontWeight: 700,
                                            }}
                                          >
                                            VAT
                                          </span>
                                        ) : (
                                          <span
                                            style={{
                                              fontSize: "9px",
                                              color: T.ink400,
                                            }}
                                          >
                                            Exempt
                                          </span>
                                        )}
                                      </td>
                                      <td
                                        style={{
                                          ...sTd,
                                          padding: "8px 10px",
                                          fontSize: "10px",
                                          color: T.ink500,
                                        }}
                                      >
                                        {l.batch_reference || "—"}
                                      </td>
                                      <td
                                        style={{
                                          ...sTd,
                                          padding: "8px 10px",
                                          fontSize: "10px",
                                          color: T.ink500,
                                        }}
                                      >
                                        {l.licence_number || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td
                                      colSpan={5}
                                      style={{
                                        padding: "8px 10px",
                                        fontSize: "10px",
                                        color: T.ink500,
                                        fontFamily: T.font,
                                        textAlign: "right",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Invoice Total:
                                    </td>
                                    <td
                                      style={{
                                        padding: "8px 10px",
                                        textAlign: "right",
                                        fontFamily: T.font,
                                        fontWeight: 700,
                                        fontVariantNumeric: "tabular-nums",
                                        color: T.accent,
                                      }}
                                    >
                                      {fmt(inv.total_amount)}
                                    </td>
                                    <td
                                      colSpan={3}
                                      style={{ padding: "8px 10px" }}
                                    >
                                      {inv.status === "paid" &&
                                        inv.payment_date && (
                                          <span
                                            style={{
                                              fontSize: "10px",
                                              color: T.success,
                                              fontWeight: 600,
                                            }}
                                          >
                                            ✓ Paid {fmtDate(inv.payment_date)}
                                            {inv.payment_reference
                                              ? ` · ${inv.payment_reference}`
                                              : ""}
                                          </span>
                                        )}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}
                            {inv.notes && (
                              <p
                                style={{
                                  fontSize: "11px",
                                  color: T.ink500,
                                  fontStyle: "italic",
                                  margin: "10px 0 0",
                                  fontFamily: T.font,
                                }}
                              >
                                Notes: {inv.notes}
                              </p>
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
        )}
      </div>
    </div>
  );
}
