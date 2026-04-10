// src/components/hq/HQInvoices.js v3.0
// ─────────────────────────────────────────────────────────────────────────────
// INVOICE MANAGEMENT — AR + AP
//
// v3.0:
//   - useTenant() added — tenant_id filter on ALL queries (LL-160 fix)
//   - Direction toggle: AR (Receivables) vs AP (Payables)
//   - Name resolution: wholesale_partners (AR) + suppliers (AP)
//   - AP aged suppliers panel — mirrors AR aged debtors
//   - Manual invoice create: slide-in panel for AP invoices
//   - Link to PO on AP create
//   - tenant_id on all INSERTs
//   - Type column: labelled badges
//   - Empty states: actionable guidance per direction
//
// v2.0: Aged debtors panel + correct column mapping (WP-FIN S4)
// v1.0: WP-GEN Session 4
//
// Tables: invoices, invoice_line_items, wholesale_partners, suppliers, purchase_orders
// LL-116: invoices uses supplier_id for ALL partners (no customer_id)
// LL-160: tenantId from useTenant() — never fetch without tenant filter
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import { sendInvoiceEmail, sendOverduePaymentEmail } from "../../services/emailService";

const T = {
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  mono: "'DM Mono','Courier New',monospace",
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
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
  shadowLg: "0 8px 32px rgba(0,0,0,0.12)",
};

const STATUS_META = {
  draft: { bg: T.ink075, color: T.ink500, label: "Draft" },
  pending: { bg: T.warningBg, color: T.warning, label: "Pending" },
  paid: { bg: T.successBg, color: T.success, label: "Paid" },
  overdue: { bg: T.dangerBg, color: T.danger, label: "Overdue" },
  cancelled: { bg: T.ink075, color: T.ink400, label: "Cancelled" },
};
const TYPE_LABEL = {
  wholesale_order: "Wholesale",
  sale: "Sale",
  ar: "Receivable",
  purchase: "Purchase",
  supplier: "Supplier",
  ap: "Payable",
};

const fmt = (n) =>
  n != null
    ? `R${parseFloat(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-ZA") : "—");
const isOverdue = (inv) => {
  if (inv.status === "paid" || inv.status === "cancelled") return false;
  if (!inv.due_date) return false;
  return new Date(inv.due_date) < new Date();
};
const daysOverdue = (inv) =>
  inv.due_date
    ? Math.floor((Date.now() - new Date(inv.due_date)) / 86400000)
    : 0;
const norm = (inv) => ({
  ...inv,
  _number: inv.invoice_number || inv.id?.slice(0, 8),
  _date: inv.invoice_date,
  _sub: parseFloat(inv.subtotal || 0),
  _vat: parseFloat(inv.vat_amount || 0),
  _total: parseFloat(inv.total_amount || 0),
  _partner: inv.supplier_id,
});
const isAP = (inv) => ["purchase", "ap", "supplier"].includes(inv.invoice_type);

const sBtn = (v = "outline") => ({
  padding: "8px 16px",
  borderRadius: 4,
  cursor: "pointer",
  fontFamily: T.font,
  fontSize: 12,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: ["primary", "danger"].includes(v)
    ? "none"
    : v === "ghost"
      ? `1px solid ${T.ink150}`
      : `1px solid ${T.accentBd}`,
  background:
    v === "primary" ? T.accent : v === "danger" ? T.danger : "transparent",
  color: ["primary", "danger"].includes(v)
    ? "#fff"
    : v === "ghost"
      ? T.ink500
      : T.accentMid,
});
const sTh = {
  padding: "8px 12px",
  fontSize: 9,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: T.ink400,
  fontWeight: 700,
  fontFamily: T.font,
  textAlign: "left",
  borderBottom: `2px solid ${T.ink150}`,
  background: T.ink050,
};
const sTd = {
  padding: "10px 12px",
  fontSize: 12,
  fontFamily: T.font,
  borderBottom: `1px solid ${T.ink075}`,
};

function StatusBadge({ status }) {
  const s = STATUS_META[status] || STATUS_META.pending;
  return (
    <span
      style={{
        fontSize: 9,
        padding: "2px 8px",
        borderRadius: 3,
        background: s.bg,
        color: s.color,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: T.font,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}
function TypeBadge({ type }) {
  const label = TYPE_LABEL[type] || type || "Invoice";
  const ap = isAP({ invoice_type: type });
  return (
    <span
      style={{
        fontSize: 9,
        padding: "2px 8px",
        borderRadius: 3,
        background: ap ? T.infoBg : T.accentLit,
        color: ap ? T.info : T.accent,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: T.font,
      }}
    >
      {label}
    </span>
  );
}

function AgedPanel({ invoices, getName, direction }) {
  const unpaid = invoices.filter(
    (i) => i.status !== "paid" && i.status !== "cancelled",
  );
  if (!unpaid.length) return null;
  const byP = {};
  unpaid.forEach((inv) => {
    const pid = inv.supplier_id || "unknown";
    if (!byP[pid])
      byP[pid] = { name: getName(pid), total: 0, buckets: [0, 0, 0, 0] };
    const days = daysOverdue(inv),
      amt = parseFloat(inv.total_amount || 0);
    byP[pid].total += amt;
    if (days <= 0) byP[pid].buckets[0] += amt;
    else if (days <= 30) byP[pid].buckets[1] += amt;
    else if (days <= 60) byP[pid].buckets[2] += amt;
    else byP[pid].buckets[3] += amt;
  });
  const partners = Object.values(byP).sort((a, b) => b.total - a.total);
  const grand = partners.reduce((s, p) => s + p.total, 0);
  const isAR = direction === "ar";
  return (
    <div
      style={{
        border: `1px solid ${T.ink150}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: T.shadow,
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          background: T.ink050,
          borderBottom: `1px solid ${T.ink150}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.ink400,
              fontFamily: T.font,
            }}
          >
            {isAR ? "Aged Debtors" : "Aged Payables"}
          </div>
          <div
            style={{
              fontSize: 12,
              color: T.ink500,
              fontFamily: T.font,
              marginTop: 2,
            }}
          >
            {isAR
              ? "What clients owe you, by age"
              : "What you owe suppliers, by age"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 11,
              color: T.ink400,
              fontFamily: T.font,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Total Outstanding
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: T.danger,
              fontFamily: T.mono,
              marginTop: 2,
            }}
          >
            {fmt(grand)}
          </div>
        </div>
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
          fontFamily: T.font,
        }}
      >
        <thead>
          <tr style={{ background: T.ink050 }}>
            {[
              isAR ? "Client / Dispensary" : "Supplier",
              "Current",
              "1–30 days",
              "31–60 days",
              "60+ days",
              "Total",
            ].map((h, i) => (
              <th
                key={h}
                style={{ ...sTh, textAlign: i === 0 ? "left" : "right" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {partners.map((p, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : T.ink050 }}>
              <td style={{ ...sTd, fontWeight: 600, color: T.ink900 }}>
                {p.name}
              </td>
              {p.buckets.map((b, bi) => (
                <td
                  key={bi}
                  style={{
                    ...sTd,
                    textAlign: "right",
                    fontFamily: T.mono,
                    color:
                      b > 0
                        ? bi >= 2
                          ? T.danger
                          : bi === 1
                            ? T.warning
                            : T.ink700
                        : T.ink300,
                  }}
                >
                  {b > 0 ? fmt(b) : "—"}
                </td>
              ))}
              <td
                style={{
                  ...sTd,
                  textAlign: "right",
                  fontWeight: 700,
                  color: T.accent,
                  fontFamily: T.mono,
                }}
              >
                {fmt(p.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr
            style={{
              background: T.accentLit,
              borderTop: `2px solid ${T.accentBd}`,
            }}
          >
            <td style={{ ...sTd, fontWeight: 700, color: T.accent }}>TOTAL</td>
            {[0, 1, 2, 3].map((bi) => (
              <td
                key={bi}
                style={{
                  ...sTd,
                  textAlign: "right",
                  fontWeight: 700,
                  fontFamily: T.mono,
                  color: T.accent,
                }}
              >
                {fmt(partners.reduce((s, p) => s + p.buckets[bi], 0))}
              </td>
            ))}
            <td
              style={{
                ...sTd,
                textAlign: "right",
                fontWeight: 700,
                fontFamily: T.mono,
                color: T.accent,
              }}
            >
              {fmt(grand)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CreateInvoiceModal({
  tenantId,
  suppliers,
  purchaseOrders,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    supplier_id: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    po_id: "",
    subtotal: "",
    vat_amount: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const total =
    parseFloat(form.subtotal || 0) + parseFloat(form.vat_amount || 0);

  const handleSave = async () => {
    if (!form.supplier_id) {
      setErr("Select a supplier.");
      return;
    }
    if (!form.invoice_number.trim()) {
      setErr("Enter the supplier invoice number.");
      return;
    }
    if (!form.subtotal || parseFloat(form.subtotal) <= 0) {
      setErr("Enter the invoice amount.");
      return;
    }
    setSaving(true);
    setErr("");
    const { error } = await supabase.from("invoices").insert({
      tenant_id: tenantId,
      invoice_number: form.invoice_number.trim(),
      invoice_type: "purchase",
      supplier_id: form.supplier_id,
      po_id: form.po_id || null,
      invoice_date: form.invoice_date || new Date().toISOString().split("T")[0],
      due_date: form.due_date || null,
      currency: "ZAR",
      subtotal: parseFloat(form.subtotal),
      vat_amount: parseFloat(form.vat_amount || 0),
      total_amount: total,
      status: "pending",
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved(form.invoice_number.trim());
  };
  const inp = {
    width: "100%",
    padding: "9px 12px",
    border: `1px solid ${T.ink150}`,
    borderRadius: 4,
    fontFamily: T.font,
    fontSize: 13,
    color: T.ink900,
    boxSizing: "border-box",
    background: "#fff",
  };
  const lbl = {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: T.ink400,
    fontFamily: T.font,
    marginBottom: 5,
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 900,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "min(560px,100vw)",
          height: "100vh",
          background: "#fff",
          overflowY: "auto",
          boxShadow: T.shadowLg,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${T.ink150}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: T.ink400,
                fontFamily: T.font,
                marginBottom: 4,
              }}
            >
              ACCOUNTS PAYABLE
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontFamily: T.font,
                fontWeight: 600,
                color: T.ink900,
              }}
            >
              Record Supplier Invoice
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: T.ink500,
                fontFamily: T.font,
              }}
            >
              Enter details from the supplier's invoice document
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: T.ink400,
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            padding: 24,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {err && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: T.dangerBg,
                border: `1px solid ${T.dangerBd}`,
                fontSize: 12,
                color: T.danger,
                fontFamily: T.font,
              }}
            >
              {err}
            </div>
          )}
          <div>
            <label style={lbl}>
              Supplier <span style={{ color: T.danger }}>*</span>
            </label>
            <select
              value={form.supplier_id}
              onChange={(e) => set("supplier_id", e.target.value)}
              style={inp}
            >
              <option value="">— Select supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.country ? ` (${s.country})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>
              Supplier Invoice Number <span style={{ color: T.danger }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. INV-2026-0042"
              value={form.invoice_number}
              onChange={(e) => set("invoice_number", e.target.value)}
              style={inp}
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={lbl}>Invoice Date</label>
              <input
                type="date"
                value={form.invoice_date}
                onChange={(e) => set("invoice_date", e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
                style={inp}
              />
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={lbl}>
                Subtotal (ZAR) <span style={{ color: T.danger }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.subtotal}
                onChange={(e) => set("subtotal", e.target.value)}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>VAT (ZAR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.vat_amount}
                onChange={(e) => set("vat_amount", e.target.value)}
                style={inp}
              />
            </div>
          </div>
          {parseFloat(form.subtotal || 0) > 0 && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: T.accentLit,
                border: `1px solid ${T.accentBd}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ fontSize: 12, color: T.accent, fontFamily: T.font }}
              >
                Total amount
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: T.accent,
                  fontFamily: T.mono,
                }}
              >
                {fmt(total)}
              </span>
            </div>
          )}
          <div>
            <label style={lbl}>Link to Purchase Order (optional)</label>
            <select
              value={form.po_id}
              onChange={(e) => set("po_id", e.target.value)}
              style={inp}
            >
              <option value="">— No PO link —</option>
              {purchaseOrders
                .filter(
                  (po) =>
                    !form.supplier_id || po.supplier_id === form.supplier_id,
                )
                .map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} · {po.po_status || po.status} ·{" "}
                    {po.currency === "ZAR"
                      ? fmt(po.subtotal)
                      : `$${po.subtotal}`}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <input
              type="text"
              placeholder="e.g. delivery charges included"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              style={inp}
            />
          </div>
        </div>
        <div
          style={{
            padding: "16px 24px",
            borderTop: `1px solid ${T.ink150}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            position: "sticky",
            bottom: 0,
            background: "#fff",
          }}
        >
          <button style={sBtn("ghost")} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...sBtn("primary"), opacity: saving ? 0.7 : 1 }}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Record Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HQInvoices({ tenantId: tenantIdProp } = {}) {
  const { tenantId: ctxId } = useTenant();
  const tenantId = tenantIdProp || ctxId;
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [purchaseOrders, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [direction, setDirection] = useState("ar");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [lineItems, setLineItems] = useState({});
  const [lineLoading, setLineLoading] = useState(null);
  const [paying, setPaying] = useState(null);
  const [payRef, setPayRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [invR, supR, partR, posR] = await Promise.all([
        supabase
          .from("invoices")
          .select(
            "id,invoice_number,invoice_type,po_id,supplier_id,invoice_date,due_date,currency,subtotal,vat_amount,total_amount,status,payment_date,payment_reference,notes",
          )
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase.from("suppliers").select("id,name,country").order("name"),
        supabase.from("wholesale_partners").select("id,business_name"),
        supabase
          .from("purchase_orders")
          .select("id,po_number,po_status,status,currency,subtotal,supplier_id")
          .eq("tenant_id", tenantId)
          .not("po_status", "in", "(complete,paid,cancelled)")
          .order("created_at", { ascending: false }),
      ]);
      if (invR.error) throw invR.error;
      setInvoices(
        (invR.data || []).map((inv) => ({
          ...inv,
          status: isOverdue(inv) ? "overdue" : inv.status,
        })),
      );
      setSuppliers(supR.data || []);
      setPartners(partR.data || []);
      setPOs(posR.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getName = useCallback(
    (id) => {
      const s = suppliers.find((x) => x.id === id);
      if (s) return s.name;
      const p = partners.find((x) => x.id === id);
      if (p) return p.business_name;
      return id ? id.slice(0, 8) + "…" : "—";
    },
    [suppliers, partners],
  );

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
      showToast("Enter a payment reference.", "error");
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
      if (inv.po_id) {
        await supabase
          .from("purchase_orders")
          .update({
            po_status: "paid",
            status: "paid",
            payment_date: new Date().toISOString().split("T")[0],
            payment_reference: payRef.trim(),
          })
          .eq("id", inv.po_id);
      }
      setPaying(null);
      setPayRef("");
      showToast(
        `${inv.invoice_number} marked paid${inv.po_id ? " — PO also updated" : ""}`,
      );
      fetchAll();
    } catch (err) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const dirInvoices = invoices.filter((inv) =>
    direction === "ap" ? isAP(inv) : !isAP(inv),
  );
  const FILTERS = [
    { id: "all", label: `All (${dirInvoices.length})` },
    {
      id: "overdue",
      label: `Overdue (${dirInvoices.filter((i) => i.status === "overdue").length})`,
      alert: true,
    },
    {
      id: "pending",
      label: `Pending (${dirInvoices.filter((i) => i.status === "pending").length})`,
    },
    {
      id: "paid",
      label: `Paid (${dirInvoices.filter((i) => i.status === "paid").length})`,
    },
    {
      id: "draft",
      label: `Draft (${dirInvoices.filter((i) => i.status === "draft").length})`,
    },
  ];
  const filtered =
    filter === "all"
      ? dirInvoices
      : dirInvoices.filter((i) => i.status === filter);
  const totalOut = dirInvoices
    .filter((i) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const overdueCount = dirInvoices.filter((i) => i.status === "overdue").length;
  const totalPaidMo = dirInvoices
    .filter((i) => {
      if (i.status !== "paid" || !i.payment_date) return false;
      const pd = new Date(i.payment_date),
        n = new Date();
      return (
        pd.getMonth() === n.getMonth() && pd.getFullYear() === n.getFullYear()
      );
    })
    .reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

  return (
    <div style={{ fontFamily: T.font, display: "grid", gap: 20 }}>
      {toast && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 4,
            fontSize: 12,
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

      {/* Direction tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `2px solid ${T.ink150}`,
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div style={{ display: "flex", gap: 0 }}>
          {[
            {
              id: "ar",
              label: "Receivables (AR)",
              sub: "What clients owe you",
            },
            { id: "ap", label: "Payables (AP)", sub: "What you owe suppliers" },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setDirection(d.id);
                setFilter("all");
                setExpanded(null);
              }}
              style={{
                padding: "12px 24px",
                background: "none",
                border: "none",
                cursor: "pointer",
                borderBottom:
                  direction === d.id
                    ? `2px solid ${T.accent}`
                    : "2px solid transparent",
                marginBottom: -2,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: direction === d.id ? 700 : 400,
                  color: direction === d.id ? T.accent : T.ink500,
                  fontFamily: T.font,
                }}
              >
                {d.label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: T.ink400,
                  fontFamily: T.font,
                  marginTop: 2,
                }}
              >
                {d.sub}
              </div>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, paddingBottom: 8 }}>
          {direction === "ap" && (
            <button
              style={{ ...sBtn("primary"), fontSize: 12 }}
              onClick={() => setShowCreate(true)}
            >
              + Record Invoice
            </button>
          )}
          <button
            style={{ ...sBtn("ghost"), fontSize: 11, padding: "6px 12px" }}
            onClick={fetchAll}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: T.ink400,
            fontFamily: T.font,
            fontSize: 13,
          }}
        >
          Loading invoices…
        </div>
      ) : error ? (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 6,
            background: T.dangerBg,
            color: T.danger,
            fontFamily: T.font,
            fontSize: 13,
            border: `1px solid ${T.dangerBd}`,
          }}
        >
          {error}
        </div>
      ) : (
        <>
          {/* Metric strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
              gap: 1,
              background: T.ink150,
              borderRadius: 6,
              overflow: "hidden",
              border: `1px solid ${T.ink150}`,
              boxShadow: T.shadow,
            }}
          >
            {[
              {
                label: "Total Invoices",
                value: dirInvoices.length,
                color: T.ink900,
              },
              {
                label: "Outstanding",
                value: fmt(totalOut),
                color: totalOut > 0 ? T.warning : T.ink900,
              },
              {
                label: "Overdue",
                value: overdueCount,
                color: overdueCount > 0 ? T.danger : T.ink900,
              },
              {
                label:
                  direction === "ar"
                    ? "Collected This Month"
                    : "Paid This Month",
                value: fmt(totalPaidMo),
                color: T.success,
              },
            ].map((m) => (
              <div
                key={m.label}
                style={{ background: "#fff", padding: "16px 18px" }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: T.ink400,
                    marginBottom: 6,
                    fontFamily: T.font,
                    fontWeight: 700,
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontFamily: T.mono,
                    fontSize: 22,
                    fontWeight: 600,
                    color: m.color,
                    lineHeight: 1,
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
                borderRadius: 6,
                padding: "12px 16px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <span style={{ color: T.danger, fontSize: 16, flexShrink: 0 }}>
                ⚠
              </span>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.danger,
                    fontFamily: T.font,
                  }}
                >
                  {overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: T.danger,
                    opacity: 0.85,
                    fontFamily: T.font,
                    marginTop: 2,
                  }}
                >
                  {direction === "ar"
                    ? "These clients have not paid within the agreed terms. Follow up immediately."
                    : "These supplier invoices are past due. Record payment to maintain supplier relationships."}
                </div>
                {direction === "ar" && (
                  <button
                    onClick={async () => {
                      const overdueRows = dirInvoices.filter(
                        (i) => i.status === "overdue",
                      );
                      if (overdueRows.length === 0) return;
                      const target = overdueRows[0];
                      const to = window.prompt(
                        `Send overdue alert for ${target.invoice_number} to:`,
                        "",
                      );
                      if (!to) return;
                      const tenantContact = window.prompt(
                        "Your tenant contact email (reply-to):",
                        "",
                      );
                      if (!tenantContact) return;
                      const res = await sendOverduePaymentEmail({
                        tenantId,
                        recipient: { email: to },
                        tenantContactEmail: tenantContact,
                        data: {
                          invoice_number: target.invoice_number,
                          customer_name: getName(target.supplier_id),
                          days_overdue: daysOverdue(target),
                          amount_outstanding: target.total_amount,
                        },
                      });
                      if (res.skipped) showToast(`Skipped (cooldown ${res.cooldown_hours}h)`, "warn");
                      else if (!res.ok) showToast(`Email failed: ${res.error}`, "error");
                      else showToast(`Overdue alert sent to ${to}`);
                    }}
                    style={{
                      marginTop: 8,
                      padding: "6px 12px",
                      background: T.danger,
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: T.font,
                    }}
                  >
                    📧 Send Overdue Alert
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Aged panel */}
          {dirInvoices.some(
            (i) => i.status !== "paid" && i.status !== "cancelled",
          ) && (
            <AgedPanel
              invoices={dirInvoices}
              getName={getName}
              direction={direction}
            />
          )}

          {/* Filter chips */}
          <div
            style={{
              display: "flex",
              gap: 6,
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
                  cursor: "pointer",
                  fontFamily: T.font,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontWeight: filter === f.id ? 700 : 400,
                  borderRadius: 4,
                  background: filter === f.id ? T.accent : "#fff",
                  color:
                    filter === f.id ? "#fff" : f.alert ? T.danger : T.ink500,
                  border: `1px solid ${filter === f.id ? T.accent : f.alert ? T.dangerBd : T.ink150}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Invoice table */}
          <div
            style={{
              border: `1px solid ${T.ink150}`,
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: T.shadow,
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 24px",
                  color: T.ink500,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 14 }}>
                  {direction === "ar" ? "🧾" : "📋"}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: T.ink700,
                    fontFamily: T.font,
                    marginBottom: 8,
                  }}
                >
                  {direction === "ar"
                    ? "No receivable invoices yet"
                    : "No supplier invoices recorded"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: T.ink400,
                    fontFamily: T.font,
                    maxWidth: 360,
                    margin: "0 auto",
                  }}
                >
                  {direction === "ar"
                    ? "Invoices are auto-generated when you ship a wholesale order. Go to Wholesale Orders to get started."
                    : "When a supplier sends you an invoice after delivery, record it here. Link it to the purchase order for full traceability."}
                </div>
                {direction === "ap" && (
                  <button
                    style={{ ...sBtn("primary"), marginTop: 20 }}
                    onClick={() => setShowCreate(true)}
                  >
                    + Record Supplier Invoice
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
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
                        "Invoice #",
                        "Type",
                        direction === "ar" ? "Client" : "Supplier",
                        "Invoice Date",
                        "Due Date",
                        "Subtotal",
                        "VAT",
                        "Total",
                        "Status",
                        "PO",
                        "",
                      ].map((h, i) => (
                        <th
                          key={h + i}
                          style={{
                            ...sTh,
                            textAlign: ["Subtotal", "VAT", "Total"].includes(h)
                              ? "right"
                              : "left",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => {
                      const n = norm(inv);
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
                              cursor: "pointer",
                            }}
                            onClick={() => handleExpand(inv.id)}
                          >
                            <td
                              style={{
                                ...sTd,
                                fontWeight: 600,
                                color: T.accent,
                                fontFamily: T.mono,
                              }}
                            >
                              {n._number}
                            </td>
                            <td style={sTd}>
                              <TypeBadge type={inv.invoice_type} />
                            </td>
                            <td
                              style={{
                                ...sTd,
                                fontWeight: 500,
                                color: T.ink900,
                              }}
                            >
                              {getName(n._partner)}
                            </td>
                            <td
                              style={{ ...sTd, color: T.ink500, fontSize: 11 }}
                            >
                              {fmtDate(inv.invoice_date)}
                            </td>
                            <td
                              style={{
                                ...sTd,
                                fontSize: 11,
                                color:
                                  inv.status === "overdue"
                                    ? T.danger
                                    : T.ink500,
                                fontWeight:
                                  inv.status === "overdue" ? 600 : 400,
                              }}
                            >
                              {fmtDate(inv.due_date)}
                              {inv.status === "overdue" && (
                                <div
                                  style={{
                                    fontSize: 9,
                                    color: T.danger,
                                    marginTop: 2,
                                  }}
                                >
                                  {daysOverdue(inv)}d overdue
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                ...sTd,
                                textAlign: "right",
                                fontFamily: T.mono,
                              }}
                            >
                              {fmt(n._sub)}
                            </td>
                            <td
                              style={{
                                ...sTd,
                                textAlign: "right",
                                fontFamily: T.mono,
                                color: T.ink500,
                              }}
                            >
                              {fmt(n._vat)}
                            </td>
                            <td
                              style={{
                                ...sTd,
                                textAlign: "right",
                                fontFamily: T.mono,
                                fontWeight: 700,
                              }}
                            >
                              {fmt(n._total)}
                            </td>
                            <td style={sTd}>
                              <StatusBadge status={inv.status} />
                            </td>
                            <td style={sTd}>
                              {inv.po_id ? (
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: "2px 6px",
                                    borderRadius: 3,
                                    background: T.infoBg,
                                    color: T.info,
                                    fontWeight: 600,
                                  }}
                                >
                                  Linked
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td
                              style={{ ...sTd, textAlign: "right" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                style={{
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
                                        ...sBtn(isPaying ? "ghost" : "primary"),
                                        padding: "4px 10px",
                                        fontSize: 9,
                                      }}
                                    >
                                      {isPaying ? "✕" : "Pay"}
                                    </button>
                                  )}
                                <button
                                  onClick={async () => {
                                    const to = window.prompt(
                                      `Email invoice ${n._number} to:`,
                                      ""
                                    );
                                    if (!to) return;
                                    const partnerName = getName(n._partner) || "";
                                    const tenantContact = window.prompt(
                                      "Your tenant contact email (reply-to):",
                                      ""
                                    );
                                    if (!tenantContact) return;
                                    const res = await sendInvoiceEmail({
                                      tenantId,
                                      recipient: { email: to, name: partnerName },
                                      tenantContactEmail: tenantContact,
                                      data: {
                                        invoice_number: n._number,
                                        invoice_date: inv.invoice_date,
                                        due_date: inv.due_date,
                                        total: n._total,
                                        customer_name: partnerName,
                                      },
                                    });
                                    if (res.skipped) {
                                      showToast(
                                        `Skipped (cooldown ${res.cooldown_hours}h)`,
                                        "warn"
                                      );
                                    } else if (!res.ok) {
                                      showToast(
                                        `Email failed: ${res.error}`,
                                        "error"
                                      );
                                    } else {
                                      showToast(`Email sent to ${to}`);
                                    }
                                  }}
                                  style={{
                                    ...sBtn("ghost"),
                                    padding: "4px 10px",
                                    fontSize: 9,
                                  }}
                                  title="Email this invoice"
                                >
                                  📧
                                </button>
                                <button
                                  onClick={() => handleExpand(inv.id)}
                                  style={{
                                    ...sBtn("ghost"),
                                    padding: "4px 10px",
                                    fontSize: 9,
                                  }}
                                >
                                  {isOpen ? "▲" : "▼"}
                                </button>
                              </div>
                            </td>
                          </tr>

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
                                    gap: 12,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 600,
                                      color: T.accent,
                                      fontFamily: T.font,
                                    }}
                                  >
                                    Recording payment for {n._number} ·{" "}
                                    {fmt(n._total)}
                                  </div>
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="Payment reference (EFT ref, cheque no)"
                                    value={payRef}
                                    onChange={(e) => setPayRef(e.target.value)}
                                    onKeyDown={(e) =>
                                      e.key === "Enter" && handleMarkPaid(inv)
                                    }
                                    style={{
                                      flex: 1,
                                      minWidth: 200,
                                      padding: "8px 12px",
                                      border: `1px solid ${T.accentBd}`,
                                      borderRadius: 4,
                                      fontFamily: T.font,
                                      fontSize: 12,
                                      color: T.ink900,
                                    }}
                                  />
                                  <button
                                    style={{
                                      ...sBtn("primary"),
                                      opacity: saving ? 0.7 : 1,
                                    }}
                                    onClick={() => handleMarkPaid(inv)}
                                    disabled={saving}
                                  >
                                    {saving ? "Saving…" : "Confirm Payment"}
                                  </button>
                                  <button
                                    style={sBtn("ghost")}
                                    onClick={() => {
                                      setPaying(null);
                                      setPayRef("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {isOpen && (
                            <tr>
                              <td
                                colSpan={11}
                                style={{
                                  padding: 16,
                                  background: T.ink050,
                                  borderBottom: `1px solid ${T.ink150}`,
                                }}
                              >
                                {lineLoading === inv.id ? (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: T.ink400,
                                      fontFamily: T.font,
                                    }}
                                  >
                                    Loading line items…
                                  </div>
                                ) : lines.length === 0 ? (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: T.ink400,
                                      fontFamily: T.font,
                                    }}
                                  >
                                    No line items recorded.
                                    {inv.notes && (
                                      <span
                                        style={{
                                          marginLeft: 8,
                                          color: T.ink500,
                                        }}
                                      >
                                        Note: {inv.notes}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <table
                                    style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                      fontSize: 11,
                                      fontFamily: T.font,
                                    }}
                                  >
                                    <thead>
                                      <tr>
                                        {[
                                          "Description",
                                          "Item",
                                          "Qty",
                                          "Unit Price",
                                          "Total",
                                          "VAT",
                                        ].map((h) => (
                                          <th
                                            key={h}
                                            style={{
                                              ...sTh,
                                              fontSize: 9,
                                              padding: "5px 8px",
                                            }}
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {lines.map((l) => (
                                        <tr key={l.id}>
                                          <td
                                            style={{
                                              ...sTd,
                                              padding: "6px 8px",
                                            }}
                                          >
                                            {l.description || "—"}
                                          </td>
                                          <td
                                            style={{
                                              ...sTd,
                                              padding: "6px 8px",
                                              color: T.ink500,
                                            }}
                                          >
                                            {l.inventory_items?.name || "—"}
                                          </td>
                                          <td
                                            style={{
                                              ...sTd,
                                              padding: "6px 8px",
                                              fontFamily: T.mono,
                                            }}
                                          >
                                            {l.quantity}
                                          </td>
                                          <td
                                            style={{
                                              ...sTd,
                                              padding: "6px 8px",
                                              fontFamily: T.mono,
                                            }}
                                          >
                                            {fmt(l.unit_price)}
                                          </td>
                                          <td
                                            style={{
                                              ...sTd,
                                              padding: "6px 8px",
                                              fontFamily: T.mono,
                                              fontWeight: 700,
                                            }}
                                          >
                                            {fmt(l.line_total)}
                                          </td>
                                          <td
                                            style={{
                                              ...sTd,
                                              padding: "6px 8px",
                                              fontSize: 10,
                                              color: l.vat_applicable
                                                ? T.success
                                                : T.ink300,
                                            }}
                                          >
                                            {l.vat_applicable
                                              ? "15%"
                                              : "Exempt"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                {inv.payment_date && (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      fontSize: 11,
                                      color: T.success,
                                      fontFamily: T.font,
                                    }}
                                  >
                                    ✓ Paid {fmtDate(inv.payment_date)}
                                    {inv.payment_reference &&
                                      ` · Ref: ${inv.payment_reference}`}
                                  </div>
                                )}
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
        </>
      )}

      {showCreate && (
        <CreateInvoiceModal
          tenantId={tenantId}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          onClose={() => setShowCreate(false)}
          onSaved={(num) => {
            setShowCreate(false);
            showToast(`Invoice ${num} recorded`);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
