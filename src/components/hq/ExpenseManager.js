// src/components/hq/ExpenseManager.js — v1.0
// WP-FIN S1: Expense Engine — add/edit/delete/bulk import from expenses table
// Replaces in-memory OPEX useState in HQProfitLoss.js

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";

// ── T tokens ──────────────────────────────────────────────────────────────────
const T = {
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentBd: "#A7D9B8",
  accentLit: "#E8F5EE",
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#747474",
  ink300: "#999999",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  warningBd: "#FDE68A",
  success: "#166534",
  successBg: "#F0FDF4",
  successBd: "#BBF7D0",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.12)",
};

const CATEGORIES = [
  {
    value: "opex",
    label: "OPEX",
    desc: "Rent, utilities, marketing, subscriptions",
  },
  {
    value: "wages",
    label: "Wages",
    desc: "Salaries, contractor fees, commissions",
  },
  {
    value: "capex",
    label: "CAPEX",
    desc: "Equipment, setup costs, infrastructure",
  },
  { value: "tax", label: "Tax", desc: "VAT payments, income tax, levies" },
  { value: "other", label: "Other", desc: "Miscellaneous business costs" },
];

const SUBCATEGORIES_BASE = {
  opex: [
    "Rent",
    "Utilities",
    "Marketing",
    "Software subscriptions",
    "Insurance",
    "Office supplies",
    "Repairs",
    "Cleaning",
    "Internet",
    "Phone",
  ],
  wages: [
    "Salaries",
    "Contractor fees",
    "Commission",
    "Bonus",
    "Benefits",
    "Training",
  ],
  capex: [
    "Equipment",
    "Vehicles",
    "Leasehold improvements",
    "Computer hardware",
    "Furniture",
    "Machinery",
  ],
  tax: ["VAT", "Income tax", "Provisional tax", "UIF", "SDL", "PAYE"],
  other: [
    "Bank charges",
    "Legal fees",
    "Accounting",
    "Printing",
    "Travel",
    "Entertainment",
    "Donations",
    "Miscellaneous",
  ],
};

const PROFILE_SUBCATS = {
  cannabis_dispensary: {
    opex:  ["SAHPRA Licensing Fees", "Cold Chain Equipment", "Professional Indemnity", "Patient Education Materials", "Controlled Substance Security", "Rent", "Utilities", "Insurance", "Marketing", "Software subscriptions"],
    wages: ["Pharmacist Salary", "Dispensary Assistant", "Salaries", "Contractor fees", "Benefits", "Training"],
    capex: ["Cold Chain Equipment", "Dispensary Fittings", "Computer hardware", "Security Equipment", "Furniture", "Machinery"],
    tax:   SUBCATEGORIES_BASE.tax,
    other: SUBCATEGORIES_BASE.other,
  },
  food_beverage: {
    opex:  ["Produce & Ingredients", "Gas & Cooking Fuel", "FSCA Compliance Fees", "Cleaning & Hygiene Supplies", "Equipment Maintenance", "Rent", "Utilities", "Marketing", "Insurance", "Software subscriptions"],
    wages: ["Kitchen Wages", "Front-of-House Wages", "Chef Salary", "Salaries", "Contractor fees", "Benefits", "Training"],
    capex: ["Kitchen Equipment", "Refrigeration", "POS Hardware", "Leasehold improvements", "Furniture", "Vehicles"],
    tax:   SUBCATEGORIES_BASE.tax,
    other: SUBCATEGORIES_BASE.other,
  },
};

function getSubcategories(industryProfile) {
  return PROFILE_SUBCATS[industryProfile] || SUBCATEGORIES_BASE;
}

// GAP-03: Subcategories that legitimately have R0 input VAT in SA
// Wages/salaries: not subject to VAT (labour is VAT-exempt)
// Insurance: exempt supply under SA VAT Act
// Banking fees: financial services are VAT-exempt
// Tax payments: not a VAT-applicable expense
const VAT_EXEMPT_CATS    = new Set(["wages", "tax"]);
const VAT_EXEMPT_SUBCATS = new Set([
  "Staff Wages", "Salaries", "Commission", "Bonus", "Benefits", "Training",
  "Pharmacist Salary", "Dispensary Assistant", "Kitchen Wages", "Front-of-House Wages", "Chef Salary",
  "Professional Indemnity",
  "Insurance",
  "Banking & Fees", "Bank charges",
  "VAT", "Income tax", "Provisional tax", "UIF", "SDL", "PAYE",
]);

const fmtZar = (n) =>
  `R${(parseFloat(n) || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = {
  expense_date: new Date().toISOString().slice(0, 10),
  category: "opex",
  subcategory: "",
  description: "",
  amount_zar: "",
  input_vat_amount: "",
  currency: "ZAR",
  amount_foreign: "",
  fx_rate: "",
  notes: "",
};

// ── Bulk import parser ────────────────────────────────────────────────────────
function parseBulkCSV(text) {
  const lines = text
    .trim()
    .split("\n")
    .filter((l) => l.trim());
  const rows = [];
  const errors = [];
  lines.forEach((line, idx) => {
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    // Expected: date, category, description, amount
    // Optional: subcategory (5th col)
    if (parts.length < 4) {
      errors.push(
        `Row ${idx + 1}: need at least date, category, description, amount`,
      );
      return;
    }
    const [date, category, description, amount, subcategory, vat_amount] = parts;
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(`Row ${idx + 1}: date must be YYYY-MM-DD, got "${date}"`);
      return;
    }
    const validCats = CATEGORIES.map((c) => c.value);
    if (!validCats.includes(category.toLowerCase())) {
      errors.push(
        `Row ${idx + 1}: category must be one of ${validCats.join(", ")}`,
      );
      return;
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      errors.push(
        `Row ${idx + 1}: amount must be a positive number, got "${amount}"`,
      );
      return;
    }
    rows.push({
      expense_date: date,
      category: category.toLowerCase(),
      description: description || "Imported expense",
      amount_zar: parseFloat(amount),
      subcategory: subcategory || "",
      input_vat_amount: vat_amount ? parseFloat(vat_amount) : 0,
      currency: "ZAR",
    });
  });
  return { rows, errors };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ExpenseManager({
  onClose,
  onSaved,
  periodStart,
  periodEnd,
}) {
  const { tenant, industryProfile } = useTenant();
  const tenantId = tenant?.id;

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("list"); // list | add | bulk | export
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const [filterCat, setFilterCat] = useState("all");
  const [toast, setToast] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [vatRegistered, setVatRegistered] = useState(false);
  // GAP-03: VAT Review mode — inline entry for missing input VAT
  const [vatFilter, setVatFilter]     = useState(false);
  const [inlineVat, setInlineVat]     = useState({});   // { [expense_id]: string }
  const [savingVat, setSavingVat]     = useState({});   // { [expense_id]: bool }

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // GAP-03: quick inline save for a single expense's input_vat_amount
  const handleInlineVatSave = async (id) => {
    const val = parseFloat(inlineVat[id]);
    if (isNaN(val) || val < 0) return showToast("Enter a valid VAT amount", "error");
    setSavingVat(p => ({ ...p, [id]: true }));
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ input_vat_amount: val })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      showToast("VAT amount saved");
      setInlineVat(p => { const n = {...p}; delete n[id]; return n; });
      fetchExpenses();
      onSaved?.();
    } catch (e) {
      showToast(`Save failed: ${e.message}`, "error");
    } finally {
      setSavingVat(p => { const n = {...p}; delete n[id]; return n; });
    }
  };

  const fetchExpenses = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let q = supabase
        .from("expenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("expense_date", { ascending: false });
      if (periodStart) q = q.gte("expense_date", periodStart);
      if (periodEnd) q = q.lte("expense_date", periodEnd);
      const { data, error } = await q;
      if (error) throw error;
      setExpenses(data || []);
    } catch (e) {
      showToast(`Failed to load expenses: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId, periodStart, periodEnd, showToast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("tenant_config")
      .select("vat_registered")
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data }) => setVatRegistered(!!data?.vat_registered));
  }, [tenantId]);

  const handleFormChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    // Auto-populate subcategory options when category changes
    if (field === "category")
      setForm((p) => ({ ...p, category: value, subcategory: "" }));
  };

  const handleSave = async () => {
    if (!form.description.trim())
      return showToast("Description is required", "error");
    if (!form.amount_zar || parseFloat(form.amount_zar) <= 0)
      return showToast("Amount must be greater than 0", "error");
    if (!form.expense_date) return showToast("Date is required", "error");
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        expense_date: form.expense_date,
        category: form.category,
        subcategory: form.subcategory || null,
        description: form.description.trim(),
        amount_zar: parseFloat(form.amount_zar),
        input_vat_amount: form.input_vat_amount
          ? parseFloat(form.input_vat_amount)
          : 0,
        currency: form.currency || "ZAR",
        amount_foreign: form.amount_foreign
          ? parseFloat(form.amount_foreign)
          : null,
        fx_rate: form.fx_rate ? parseFloat(form.fx_rate) : null,
        notes: form.notes?.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingId)
          .eq("tenant_id", tenantId);
        if (error) throw error;
        showToast("Expense updated");
      } else {
        const { error } = await supabase.from("expenses").insert(payload);
        if (error) throw error;
        showToast("Expense saved");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setActiveTab("list");
      fetchExpenses();
      onSaved?.();
    } catch (e) {
      showToast(`Save failed: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense) => {
    setForm({
      expense_date: expense.expense_date || "",
      category: expense.category || "opex",
      subcategory: expense.subcategory || "",
      description: expense.description || "",
      amount_zar: String(expense.amount_zar || ""),
      input_vat_amount: expense.input_vat_amount
        ? String(expense.input_vat_amount)
        : "",
      currency: expense.currency || "ZAR",
      amount_foreign: expense.amount_foreign
        ? String(expense.amount_foreign)
        : "",
      fx_rate: expense.fx_rate ? String(expense.fx_rate) : "",
      notes: expense.notes || "",
    });
    setEditingId(expense.id);
    setActiveTab("add");
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      showToast("Expense deleted");
      setDeleteId(null);
      fetchExpenses();
      onSaved?.();
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, "error");
    }
  };

  const handleBulkImport = async () => {
    const { rows, errors } = parseBulkCSV(bulkText);
    if (errors.length > 0) {
      setBulkResult({ errors, rows: [] });
      return;
    }
    if (rows.length === 0) {
      setBulkResult({ errors: ["No valid rows found"], rows: [] });
      return;
    }
    setSaving(true);
    try {
      const payload = rows.map((r) => ({ ...r, tenant_id: tenantId }));
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) throw error;
      setBulkResult({ errors: [], rows, success: true });
      setBulkText("");
      fetchExpenses();
      onSaved?.();
      showToast(
        `${rows.length} expense${rows.length !== 1 ? "s" : ""} imported`,
      );
    } catch (e) {
      setBulkResult({ errors: [e.message], rows: [] });
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const filtered =
      filterCat === "all"
        ? expenses
        : expenses.filter((e) => e.category === filterCat);
    const header =
      "Date,Category,Subcategory,Description,Amount ZAR,Input VAT,Currency,Notes";
    const rows = filtered.map(
      (e) =>
        `${e.expense_date},${e.category},${e.subcategory || ""},${JSON.stringify(e.description)},${e.amount_zar},${e.input_vat_amount || 0},${e.currency || "ZAR"},${JSON.stringify(e.notes || "")}`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filtered + grouped expenses ───────────────────────────────────────────
  const filtered =
    filterCat === "all"
      ? expenses
      : expenses.filter((e) => e.category === filterCat);
  const totalByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = expenses
      .filter((e) => e.category === cat.value)
      .reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0);
    return acc;
  }, {});
  const grandTotal = Object.values(totalByCategory).reduce((s, v) => s + v, 0);

  // GAP-03: expenses that genuinely need input VAT entered
  const needsVatReview = expenses.filter(e =>
    !(parseFloat(e.input_vat_amount) > 0) &&
    !VAT_EXEMPT_CATS.has(e.category) &&
    !VAT_EXEMPT_SUBCATS.has(e.subcategory)
  );
  const displayExpenses = vatFilter ? needsVatReview : filtered;

  // ── Shared input styles ───────────────────────────────────────────────────
  const inp = {
    padding: "8px 10px",
    border: `1px solid ${T.ink150}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: T.font,
    color: T.ink900,
    background: "#fff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  const lbl = {
    fontFamily: T.font,
    fontSize: 11,
    fontWeight: 600,
    color: T.ink500,
    marginBottom: 4,
    display: "block",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  };
  const btn = (variant = "primary") => ({
    padding: "8px 16px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: T.font,
    fontSize: 12,
    fontWeight: 600,
    transition: "all 0.12s",
    ...(variant === "primary"
      ? { background: T.accent, color: "#fff", border: "none" }
      : variant === "secondary"
        ? {
            background: "#fff",
            color: T.ink700,
            border: `1px solid ${T.ink150}`,
          }
        : variant === "danger"
          ? {
              background: T.dangerBg,
              color: T.danger,
              border: `1px solid ${T.dangerBd}`,
            }
          : {}),
  });

  const catColor = (cat) =>
    ({
      opex: "#1E3A5F",
      wages: "#92400E",
      capex: "#166534",
      tax: "#991B1B",
      other: "#5A5A5A",
    })[cat] || T.ink500;
  const catBg = (cat) =>
    ({
      opex: "#EFF6FF",
      wages: "#FFFBEB",
      capex: "#F0FDF4",
      tax: "#FEF2F2",
      other: T.ink075,
    })[cat] || T.ink050;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 820,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: T.shadowMd,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px 0",
            borderBottom: `1px solid ${T.ink150}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 16,
                  fontWeight: 600,
                  color: T.ink900,
                }}
              >
                Expense Manager
              </div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 11,
                  color: T.ink500,
                  marginTop: 2,
                }}
              >
                {expenses.length} expense{expenses.length !== 1 ? "s" : ""} ·
                Total: {fmtZar(grandTotal)}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
                color: T.ink400,
              }}
            >
              ✕
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            {[
              { id: "list", label: "📋 Expenses" },
              { id: "add", label: editingId ? "✏️ Edit" : "+ Add" },
              { id: "bulk", label: "📥 Bulk Import" },
              { id: "export", label: "📤 Export" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  if (t.id !== "add") {
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: T.font,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 14px",
                  marginBottom: -1,
                  color: activeTab === t.id ? T.accent : T.ink500,
                  borderBottom:
                    activeTab === t.id
                      ? `2px solid ${T.accent}`
                      : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* ── LIST TAB ── */}
          {activeTab === "list" && (
            <>
              {/* GAP-03: Missing VAT banner */}
              {vatRegistered && needsVatReview.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", marginBottom: 12,
                  background: T.warningBg, border: `1px solid ${T.warningBd}`,
                  borderRadius: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>⚠</span>
                    <div>
                      <div style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.warning }}>
                        {needsVatReview.length} expense{needsVatReview.length !== 1 ? "s" : ""} missing input VAT amount
                      </div>
                      <div style={{ fontFamily: T.font, fontSize: 11, color: T.warning, opacity: 0.8, marginTop: 1 }}>
                        Wages, insurance, and banking are correctly excluded as VAT-exempt.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setVatFilter(v => !v)}
                    style={{
                      padding: "6px 14px", borderRadius: 6, border: `1px solid ${T.warningBd}`,
                      background: vatFilter ? T.warning : "#fff",
                      color: vatFilter ? "#fff" : T.warning,
                      fontFamily: T.font, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    {vatFilter ? "✓ Reviewing" : "Review →"}
                  </button>
                </div>
              )}
              {vatRegistered && needsVatReview.length === 0 && expenses.length > 0 && (
                <div style={{
                  padding: "8px 14px", marginBottom: 12,
                  background: T.successBg, border: `1px solid ${T.successBd}`,
                  borderRadius: 8, fontFamily: T.font, fontSize: 12,
                  color: T.success, fontWeight: 600,
                }}>
                  ✓ All applicable expenses have VAT amounts entered
                </div>
              )}

              {/* Summary strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5,1fr)",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() =>
                      setFilterCat(filterCat === cat.value ? "all" : cat.value)
                    }
                    style={{
                      padding: "10px 8px",
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "center",
                      background:
                        filterCat === cat.value ? catBg(cat.value) : T.ink050,
                      border: `1px solid ${filterCat === cat.value ? catColor(cat.value) + "44" : T.ink150}`,
                      transition: "all 0.12s",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: 10,
                        fontWeight: 600,
                        color: catColor(cat.value),
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        marginBottom: 3,
                      }}
                    >
                      {cat.label}
                    </div>
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.ink900,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtZar(totalByCategory[cat.value])}
                    </div>
                  </button>
                ))}
              </div>

              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    fontFamily: T.font,
                    fontSize: 13,
                    color: T.ink400,
                  }}
                >
                  Loading expenses…
                </div>
              ) : displayExpenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontFamily: T.font, fontSize: 14, color: T.ink400, marginBottom: 12 }}>
                    {vatFilter
                      ? "All applicable expenses have VAT amounts — nothing to review"
                      : filterCat === "all"
                        ? "No expenses yet for this period"
                        : `No ${filterCat} expenses`}
                  </div>
                  {!vatFilter && (
                    <button onClick={() => setActiveTab("add")} style={btn()}>
                      + Add First Expense
                    </button>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    border: `1px solid ${T.ink150}`,
                    borderRadius: 8,
                    overflow: "hidden",
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
                      <tr style={{ background: T.accent }}>
                        {["Date", "Category", "Description", "Amount", vatRegistered ? "VAT" : null, ""].filter(Boolean).map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                padding: "8px 12px",
                                textAlign: "left",
                                color: "#fff",
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: "0.07em",
                                textTransform: "uppercase",
                              }}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {displayExpenses.map((e, i) => (
                        <tr
                          key={e.id}
                          style={{
                            background: i % 2 === 0 ? "#fff" : T.ink050,
                            borderBottom: `1px solid ${T.ink075}`,
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: 12,
                              color: T.ink500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {e.expense_date}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: catBg(e.category),
                                color: catColor(e.category),
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                              }}
                            >
                              {e.category}
                            </span>
                            {e.subcategory && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: T.ink400,
                                  marginLeft: 6,
                                }}
                              >
                                {e.subcategory}
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: 13,
                              color: T.ink700,
                            }}
                          >
                            {e.description}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: 13,
                              fontWeight: 600,
                              color: T.danger,
                              fontVariantNumeric: "tabular-nums",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fmtZar(e.amount_zar)}
                          </td>
                          {vatRegistered && (
                            <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>
                              {vatFilter ? (
                                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={inlineVat[e.id] ?? ""}
                                    onChange={ev => setInlineVat(p => ({ ...p, [e.id]: ev.target.value }))}
                                    style={{
                                      width: 80, padding: "4px 6px", fontSize: 12,
                                      border: `1px solid ${T.ink150}`, borderRadius: 4,
                                      fontFamily: T.font,
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      const amt = parseFloat(e.amount_zar);
                                      if (amt > 0) setInlineVat(p => ({ ...p, [e.id]: ((amt * 15) / 115).toFixed(2) }));
                                    }}
                                    title="Auto-calculate 15% from inclusive amount"
                                    style={{
                                      padding: "4px 6px", fontSize: 10, borderRadius: 4,
                                      border: `1px solid ${T.accentBd}`, background: T.accentLit,
                                      color: T.accent, cursor: "pointer", fontFamily: T.font,
                                      fontWeight: 600, flexShrink: 0,
                                    }}
                                  >
                                    15%
                                  </button>
                                  <button
                                    onClick={() => handleInlineVatSave(e.id)}
                                    disabled={!inlineVat[e.id] || savingVat[e.id]}
                                    style={{
                                      padding: "4px 8px", fontSize: 10, borderRadius: 4,
                                      border: "none", background: inlineVat[e.id] ? T.accent : T.ink150,
                                      color: "#fff", cursor: inlineVat[e.id] ? "pointer" : "default",
                                      fontFamily: T.font, fontWeight: 600, flexShrink: 0,
                                    }}
                                  >
                                    {savingVat[e.id] ? "…" : "Save"}
                                  </button>
                                </div>
                              ) : (
                                <span style={{
                                  fontSize: 12, fontVariantNumeric: "tabular-nums",
                                  color: parseFloat(e.input_vat_amount) > 0 ? T.accentMid : T.ink300,
                                }}>
                                  {parseFloat(e.input_vat_amount) > 0 ? fmtZar(e.input_vat_amount) : "—"}
                                </span>
                              )}
                            </td>
                          )}
                          <td
                            style={{
                              padding: "10px 12px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => handleEdit(e)}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  background: T.ink050,
                                  border: `1px solid ${T.ink150}`,
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  fontFamily: T.font,
                                }}
                              >
                                Edit
                              </button>
                              {deleteId === e.id ? (
                                <>
                                  <button
                                    onClick={() => handleDelete(e.id)}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: 11,
                                      background: T.dangerBg,
                                      border: `1px solid ${T.dangerBd}`,
                                      color: T.danger,
                                      borderRadius: 4,
                                      cursor: "pointer",
                                      fontFamily: T.font,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteId(null)}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: 11,
                                      background: "#fff",
                                      border: `1px solid ${T.ink150}`,
                                      borderRadius: 4,
                                      cursor: "pointer",
                                      fontFamily: T.font,
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setDeleteId(e.id)}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: 11,
                                    background: "#fff",
                                    border: `1px solid ${T.dangerBd}`,
                                    color: T.danger,
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    fontFamily: T.font,
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr
                        style={{
                          background: T.ink050,
                          borderTop: `2px solid ${T.ink150}`,
                        }}
                      >
                        <td colSpan={3} style={{ padding: "10px 12px", fontFamily: T.font, fontSize: 12, fontWeight: 600, color: T.ink500 }}>
                          {displayExpenses.length} expense{displayExpenses.length !== 1 ? "s" : ""}
                          {vatFilter ? " · missing VAT" : filterCat !== "all" ? ` (${filterCat} only)` : ""}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: T.font, fontSize: 14, fontWeight: 700, color: T.danger, fontVariantNumeric: "tabular-nums" }}>
                          {fmtZar(displayExpenses.reduce((s, e) => s + (parseFloat(e.amount_zar) || 0), 0))}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── ADD / EDIT TAB ── */}
          {activeTab === "add" && (
            <div style={{ maxWidth: 560 }}>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  color: T.ink500,
                  marginBottom: 20,
                }}
              >
                {editingId
                  ? "Edit expense — changes save immediately to the expenses table."
                  : "Add a new expense. All entries are persisted to the database."}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={lbl}>Date</label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) =>
                      handleFormChange("expense_date", e.target.value)
                    }
                    style={inp}
                  />
                </div>
                <div>
                  <label style={lbl}>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      handleFormChange("category", e.target.value)
                    }
                    style={inp}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label} — {c.desc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={lbl}>Subcategory (optional)</label>
                  <select
                    value={form.subcategory}
                    onChange={(e) =>
                      handleFormChange("subcategory", e.target.value)
                    }
                    style={inp}
                  >
                    <option value="">— None —</option>
                    {(getSubcategories(industryProfile)[form.category] || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Amount (ZAR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount_zar}
                    onChange={(e) =>
                      handleFormChange("amount_zar", e.target.value)
                    }
                    placeholder="0.00"
                    style={inp}
                  />
                </div>
                {vatRegistered && (
                  <div>
                    <label style={lbl}>Input VAT (R)</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.input_vat_amount}
                        onChange={(e) =>
                          handleFormChange("input_vat_amount", e.target.value)
                        }
                        placeholder="0.00"
                        style={{ ...inp, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const amt = parseFloat(form.amount_zar);
                          if (amt > 0) {
                            handleFormChange(
                              "input_vat_amount",
                              ((amt * 15) / 115).toFixed(2)
                            );
                          }
                        }}
                        title="Calculate 15% VAT from inclusive amount"
                        style={{
                          padding: "8px 10px",
                          background: T.accentLit,
                          border: `1px solid ${T.accentBd}`,
                          borderRadius: 6,
                          cursor: "pointer",
                          fontFamily: T.font,
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.accent,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        Calc 15%
                      </button>
                    </div>
                    <div style={{ fontSize: 10, color: T.ink400, marginTop: 3, fontFamily: T.font }}>
                      From supplier tax invoice. Auto-filled by Smart Capture.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    handleFormChange("description", e.target.value)
                  }
                  placeholder="e.g. Office rent — March 2026"
                  style={inp}
                />
              </div>

              {/* Foreign currency (optional) */}
              <div
                style={{
                  marginBottom: 16,
                  padding: "12px 14px",
                  background: T.ink050,
                  borderRadius: 8,
                  border: `1px solid ${T.ink150}`,
                }}
              >
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.ink400,
                    marginBottom: 10,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Foreign Currency (optional)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <label style={lbl}>Currency</label>
                    <select
                      value={form.currency}
                      onChange={(e) =>
                        handleFormChange("currency", e.target.value)
                      }
                      style={inp}
                    >
                      {["ZAR", "USD", "EUR", "GBP", "CNY", "AED"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Foreign amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount_foreign}
                      onChange={(e) =>
                        handleFormChange("amount_foreign", e.target.value)
                      }
                      placeholder="0.00"
                      style={inp}
                    />
                  </div>
                  <div>
                    <label style={lbl}>FX rate used</label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={form.fx_rate}
                      onChange={(e) =>
                        handleFormChange("fx_rate", e.target.value)
                      }
                      placeholder="e.g. 18.50"
                      style={inp}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  placeholder="Any additional notes…"
                  rows={2}
                  style={{ ...inp, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ ...btn("primary"), opacity: saving ? 0.6 : 1 }}
                >
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Update Expense"
                      : "Save Expense"}
                </button>
                <button
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setEditingId(null);
                    setActiveTab("list");
                  }}
                  style={btn("secondary")}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── BULK IMPORT TAB ── */}
          {activeTab === "bulk" && (
            <div>
              <div
                style={{
                  padding: "12px 16px",
                  background: T.accentLit,
                  border: `1px solid ${T.accentBd}`,
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.accent,
                    marginBottom: 6,
                  }}
                >
                  CSV Format
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: T.accentMid,
                    lineHeight: 1.8,
                  }}
                >
                  date (YYYY-MM-DD), category, description, amount_zar,
                  subcategory (optional), vat_amount (optional)
                  <br />
                  <strong>Categories:</strong> opex · wages · capex · tax ·
                  other
                </div>
              </div>

              <div
                style={{
                  padding: "10px 14px",
                  background: T.ink050,
                  borderRadius: 6,
                  marginBottom: 14,
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: T.ink500,
                  lineHeight: 1.8,
                }}
              >
                <strong>Example:</strong>
                <br />
                2026-03-01,opex,Office rent,8500,Rent
                <br />
                2026-03-01,wages,Developer salary,25000,Salaries
                <br />
                2026-03-15,capex,Extraction equipment,45000,Equipment
                <br />
                2026-03-01,opex,Electricity,1200,Utilities
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => {
                  setBulkText(e.target.value);
                  setBulkResult(null);
                }}
                placeholder="Paste your CSV rows here…"
                rows={10}
                style={{
                  ...inp,
                  fontFamily: "monospace",
                  fontSize: 12,
                  marginBottom: 14,
                }}
              />

              {bulkResult && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: bulkResult.success ? T.successBg : T.dangerBg,
                    border: `1px solid ${bulkResult.success ? T.successBd : T.dangerBd}`,
                  }}
                >
                  {bulkResult.success ? (
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: 13,
                        color: T.success,
                      }}
                    >
                      ✓ {bulkResult.rows.length} expense
                      {bulkResult.rows.length !== 1 ? "s" : ""} imported
                      successfully
                    </div>
                  ) : (
                    bulkResult.errors.map((e, i) => (
                      <div
                        key={i}
                        style={{
                          fontFamily: T.font,
                          fontSize: 12,
                          color: T.danger,
                          marginBottom: 4,
                        }}
                      >
                        ⚠ {e}
                      </div>
                    ))
                  )}
                  {!bulkResult.success && bulkResult.rows.length > 0 && (
                    <div
                      style={{
                        fontFamily: T.font,
                        fontSize: 12,
                        color: T.success,
                        marginTop: 8,
                      }}
                    >
                      {bulkResult.rows.length} valid row
                      {bulkResult.rows.length !== 1 ? "s" : ""} ready — fix
                      errors above then try again
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleBulkImport}
                  disabled={!bulkText.trim() || saving}
                  style={{
                    ...btn("primary"),
                    opacity: !bulkText.trim() || saving ? 0.5 : 1,
                  }}
                >
                  {saving ? "Importing…" : "Import Expenses"}
                </button>
                <button
                  onClick={() => {
                    setBulkText("");
                    setBulkResult(null);
                  }}
                  style={btn("secondary")}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ── EXPORT TAB ── */}
          {activeTab === "export" && (
            <div>
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  color: T.ink500,
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                Export your expenses as CSV. Compatible with Excel, Google
                Sheets, and accounting software. Future: direct
                Xero/Sage/QuickBooks integration via API.
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Filter by Category</label>
                <select
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  style={{ ...inp, maxWidth: 240 }}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  padding: "16px",
                  background: T.ink050,
                  borderRadius: 8,
                  marginBottom: 20,
                  border: `1px solid ${T.ink150}`,
                }}
              >
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.ink700,
                    marginBottom: 8,
                  }}
                >
                  Export summary
                </div>
                <div
                  style={{ fontFamily: T.font, fontSize: 13, color: T.ink500 }}
                >
                  {filterCat === "all"
                    ? expenses.length
                    : expenses.filter((e) => e.category === filterCat)
                        .length}{" "}
                  expense row{expenses.length !== 1 ? "s" : ""} · Total{" "}
                  {fmtZar(
                    filterCat === "all"
                      ? grandTotal
                      : totalByCategory[filterCat] || 0,
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexDirection: "column",
                  maxWidth: 300,
                }}
              >
                <button onClick={handleExportCSV} style={btn("primary")}>
                  ↓ Download CSV
                </button>
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 11,
                    color: T.ink400,
                    lineHeight: 1.5,
                  }}
                >
                  Xero/Sage/QuickBooks direct integration — coming in WP-FIN S6
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: `1px solid ${T.ink150}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ fontFamily: T.font, fontSize: 11, color: T.ink400 }}>
            WP-FIN S1 · expenses table · tenant_id enforced
          </div>
          <button onClick={onClose} style={btn("secondary")}>
            Close
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 2000,
            background: toast.type === "error" ? T.danger : T.accent,
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 8,
            fontFamily: T.font,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: T.shadowMd,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
