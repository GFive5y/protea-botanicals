// src/components/hq/HQSuppliers.js — v1.2
// v1.2: Edit Product panel — click Edit on any catalogue row to update price, SKU, MOQ, weight, lead time, description
// v1.1: Light theme fix, Add Supplier panel, live refresh

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

const T = {
  ink900: "#0D0D0D",
  ink700: "#2C2C2C",
  ink500: "#5A5A5A",
  ink400: "#474747",
  ink150: "#E2E2E2",
  ink075: "#F4F4F3",
  ink050: "#FAFAF9",
  accent: "#1A3D2B",
  accentMid: "#2D6A4F",
  accentLit: "#E8F5EE",
  accentBd: "#A7D9B8",
  success: "#166534",
  successBg: "#F0FDF4",
  danger: "#991B1B",
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  warning: "#92400E",
  warningBg: "#FFFBEB",
  info: "#1E3A5F",
  infoBg: "#EFF6FF",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
  shadow: "0 1px 3px rgba(0,0,0,0.07)",
};
const C = {
  bg: T.ink075,
  surface: "#ffffff",
  border: T.ink150,
  text: T.ink900,
  muted: T.ink500,
  accent: T.accentMid,
  accentDim: T.accentLit,
  warn: "#b5935a",
  warnDim: "#fdf6ec",
  danger: T.danger,
  dangerDim: T.dangerBg,
  info: T.info,
  infoDim: T.infoBg,
  gold: "#b5935a",
  primaryDark: T.accent,
};

const DDP_TIERS = [
  { maxKg: 21, ratePerKg: 15.8 },
  { maxKg: 50, ratePerKg: 15.5 },
  { maxKg: 100, ratePerKg: 15.2 },
  { maxKg: Infinity, ratePerKg: 14.9 },
];
const DDP_CLEARANCE_USD = 25;
function calcDdpAir(weightKg) {
  if (!weightKg || weightKg <= 0) return 0;
  const tier = DDP_TIERS.find((t) => weightKg <= t.maxKg);
  return weightKg * tier.ratePerKg + DDP_CLEARANCE_USD;
}

function useFxRate() {
  const [fx, setFx] = useState({
    usd_zar: null,
    eur_zar: null,
    source: null,
    fetched_at: null,
  });
  const [loading, setLoading] = useState(true);
  const fetchRate = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-fx-rate`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      const json = await res.json();
      setFx(json);
    } catch (e) {
      setFx({
        usd_zar: 18.5,
        eur_zar: 20.2,
        source: "error_fallback",
        fetched_at: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchRate();
  }, [fetchRate]);
  return { fx, loading, refresh: fetchRate };
}

function Badge({ label, color = C.info, bg = C.infoDim }) {
  return (
    <span
      style={{
        background: bg,
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {label}
    </span>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: 16,
        marginBottom: 12,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>
          {label}
        </div>
      )}
      <input
        {...props}
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color: C.text,
          padding: "8px 12px",
          width: "100%",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          ...props.style,
        }}
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>
          {label}
        </div>
      )}
      <select
        {...props}
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color: C.text,
          padding: "8px 12px",
          width: "100%",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          ...props.style,
        }}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Edit Product Panel (NEW v1.2) ────────────────────────────────────────────
function EditProductPanel({ product, suppliers, onClose, onSaved }) {
  const [form, setForm] = useState({
    supplier_id: product.supplier_id || "",
    sku: product.sku || "",
    name: product.name || "",
    category: product.category || "hardware",
    description: product.description || "",
    unit_price_usd:
      product.unit_price_usd != null ? String(product.unit_price_usd) : "",
    currency: product.currency || "USD",
    moq: product.moq != null ? String(product.moq) : "",
    weight_kg_per_unit:
      product.weight_kg_per_unit != null
        ? String(product.weight_kg_per_unit)
        : "",
    lead_time_days:
      product.lead_time_days != null ? String(product.lead_time_days) : "",
    notes: product.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.supplier_id || !form.name.trim()) {
      setError("Supplier and name are required.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      supplier_id: form.supplier_id,
      sku: form.sku.trim() || null,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      unit_price_usd:
        form.unit_price_usd !== "" ? parseFloat(form.unit_price_usd) : null,
      currency: form.currency,
      moq: form.moq !== "" ? parseInt(form.moq) : 1,
      weight_kg_per_unit:
        form.weight_kg_per_unit !== ""
          ? parseFloat(form.weight_kg_per_unit)
          : null,
      lead_time_days:
        form.lead_time_days !== "" ? parseInt(form.lead_time_days) : null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = await supabase
      .from("supplier_products")
      .update(payload)
      .eq("id", product.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 440,
        height: "100vh",
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        zIndex: 1000,
        overflowY: "auto",
        padding: 24,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              color: C.text,
              fontWeight: 700,
              fontSize: 18,
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            Edit Product
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            Update price, SKU, weight or any field
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      <Select
        label="Supplier *"
        value={form.supplier_id}
        onChange={(e) => set("supplier_id", e.target.value)}
      >
        <option value="">— select supplier —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.country})
          </option>
        ))}
      </Select>
      <Select
        label="Category"
        value={form.category}
        onChange={(e) => set("category", e.target.value)}
      >
        <option value="hardware">Hardware</option>
        <option value="terpene">Terpene</option>
        <option value="packaging">Packaging</option>
        <option value="distillate">Distillate</option>
        <option value="other">Other</option>
      </Select>
      <Input
        label="Product Name *"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <Input
        label="SKU / Code"
        value={form.sku}
        onChange={(e) => set("sku", e.target.value)}
        placeholder="e.g. AIM-510-1ML"
      />

      <div
        style={{
          background: C.accentDim,
          border: `1px solid ${C.accent}40`,
          borderRadius: 6,
          padding: "12px 14px",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: C.accent,
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          💲 Pricing
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Input
            label="Unit Price"
            type="number"
            value={form.unit_price_usd}
            onChange={(e) => set("unit_price_usd", e.target.value)}
            placeholder="0.00"
            style={{ marginBottom: 0 }}
          />
          <Select
            label="Currency"
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="ZAR">ZAR</option>
            <option value="CNY">CNY</option>
          </Select>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <Input
          label="MOQ"
          type="number"
          value={form.moq}
          onChange={(e) => set("moq", e.target.value)}
          placeholder="1"
        />
        <Input
          label="Weight kg/unit"
          type="number"
          value={form.weight_kg_per_unit}
          onChange={(e) => set("weight_kg_per_unit", e.target.value)}
          placeholder="0.0000"
        />
        <Input
          label="Lead Time (days)"
          type="number"
          value={form.lead_time_days}
          onChange={(e) => set("lead_time_days", e.target.value)}
          placeholder="21"
        />
      </div>
      <Input
        label="Description"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="Optional"
      />
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>
          Notes
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.text,
            padding: "8px 12px",
            width: "100%",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            background: C.dangerDim,
            border: `1px solid ${C.danger}30`,
            borderLeft: `3px solid ${C.danger}`,
            borderRadius: 4,
            padding: "8px 12px",
            color: C.danger,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: "none",
            color: C.muted,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          style={{
            flex: 2,
            background: C.accent,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "12px 24px",
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: 14,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "✓ Update Product"}
        </button>
      </div>
    </div>
  );
}

// ─── Add Supplier panel ───────────────────────────────────────────────────────
function AddSupplierPanel({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    country: "South Africa",
    currency: "ZAR",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    website: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.name.trim()) {
      setError("Supplier name is required.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("suppliers").insert([
      {
        name: form.name.trim(),
        country: form.country.trim() || "Unknown",
        currency: form.currency,
        contact_name: form.contact_name.trim() || null,
      },
    ]);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 440,
        height: "100vh",
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        zIndex: 1000,
        overflowY: "auto",
        padding: 24,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              color: C.text,
              fontWeight: 700,
              fontSize: 18,
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            Add New Supplier
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            Hardware · Terpene · Packaging · IT · Transport · Any sector
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            color: C.muted,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Company Details
        </div>
        <Input
          label="Company Name *"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Acme Packaging Co."
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Input
            label="Country"
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
          />
          <Select
            label="Invoicing Currency"
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
          >
            <option value="ZAR">ZAR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="CNY">CNY</option>
            <option value="GBP">GBP</option>
          </Select>
        </div>
      </div>
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            color: C.muted,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Contact (optional)
        </div>
        <Input
          label="Contact Person"
          value={form.contact_name}
          onChange={(e) => set("contact_name", e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={form.contact_email}
          onChange={(e) => set("contact_email", e.target.value)}
        />
        <Input
          label="Phone / WhatsApp"
          value={form.contact_phone}
          onChange={(e) => set("contact_phone", e.target.value)}
        />
        <Input
          label="Website"
          value={form.website}
          onChange={(e) => set("website", e.target.value)}
        />
      </div>
      {error && (
        <div
          style={{
            background: C.dangerDim,
            border: `1px solid ${C.danger}30`,
            borderLeft: `3px solid ${C.danger}`,
            borderRadius: 4,
            padding: "8px 12px",
            color: C.danger,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      <button
        onClick={save}
        disabled={saving}
        style={{
          background: C.accent,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "12px 24px",
          cursor: saving ? "not-allowed" : "pointer",
          fontWeight: 600,
          width: "100%",
          fontSize: 14,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : "✓ Save Supplier"}
      </button>
    </div>
  );
}

// ─── Add Product panel ────────────────────────────────────────────────────────
function AddProductPanel({ suppliers, onClose, onSaved }) {
  const [form, setForm] = useState({
    supplier_id: "",
    sku: "",
    name: "",
    category: "hardware",
    description: "",
    unit_price_usd: "",
    currency: "USD",
    moq: "",
    weight_kg_per_unit: "",
    lead_time_days: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.supplier_id || !form.name) {
      setError("Supplier and name are required.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("supplier_products").insert([
      {
        supplier_id: form.supplier_id,
        sku: form.sku || null,
        name: form.name,
        category: form.category,
        description: form.description || null,
        unit_price_usd: form.unit_price_usd
          ? parseFloat(form.unit_price_usd)
          : null,
        currency: form.currency,
        moq: form.moq ? parseInt(form.moq) : 1,
        weight_kg_per_unit: form.weight_kg_per_unit
          ? parseFloat(form.weight_kg_per_unit)
          : null,
        lead_time_days: form.lead_time_days
          ? parseInt(form.lead_time_days)
          : null,
        notes: form.notes || null,
      },
    ]);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 440,
        height: "100vh",
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        zIndex: 1000,
        overflowY: "auto",
        padding: 24,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            color: C.text,
            fontWeight: 700,
            fontSize: 18,
            fontFamily: "'Cormorant Garamond', serif",
          }}
        >
          Add Supplier Product
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      <Select
        label="Supplier *"
        value={form.supplier_id}
        onChange={(e) => set("supplier_id", e.target.value)}
      >
        <option value="">— select supplier —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.country})
          </option>
        ))}
      </Select>
      <Select
        label="Category"
        value={form.category}
        onChange={(e) => set("category", e.target.value)}
      >
        <option value="hardware">Hardware</option>
        <option value="terpene">Terpene</option>
        <option value="packaging">Packaging</option>
        <option value="distillate">Distillate</option>
        <option value="other">Other</option>
      </Select>
      <Input
        label="Product Name *"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="e.g. Postless 510 Cartridge 1ml"
      />
      <Input
        label="SKU / Code"
        value={form.sku}
        onChange={(e) => set("sku", e.target.value)}
        placeholder="e.g. AIM-510-1ML"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Unit Price"
          type="number"
          value={form.unit_price_usd}
          onChange={(e) => set("unit_price_usd", e.target.value)}
          placeholder="0.00"
        />
        <Select
          label="Currency"
          value={form.currency}
          onChange={(e) => set("currency", e.target.value)}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="ZAR">ZAR</option>
          <option value="CNY">CNY</option>
        </Select>
        <Input
          label="MOQ"
          type="number"
          value={form.moq}
          onChange={(e) => set("moq", e.target.value)}
          placeholder="1"
        />
        <Input
          label="Weight kg/unit"
          type="number"
          value={form.weight_kg_per_unit}
          onChange={(e) => set("weight_kg_per_unit", e.target.value)}
          placeholder="0.0000"
        />
        <Input
          label="Lead Time (days)"
          type="number"
          value={form.lead_time_days}
          onChange={(e) => set("lead_time_days", e.target.value)}
          placeholder="21"
        />
      </div>
      <Input
        label="Description"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="Optional"
      />
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>
          Notes
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.text,
            padding: "8px 12px",
            width: "100%",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
      </div>
      {error && (
        <div style={{ color: C.danger, fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}
      <button
        onClick={save}
        disabled={saving}
        style={{
          background: C.accent,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "12px 24px",
          cursor: "pointer",
          fontWeight: 600,
          width: "100%",
          fontSize: 14,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : "✓ Save Product"}
      </button>
    </div>
  );
}

// ─── Add Local Input panel ────────────────────────────────────────────────────
function AddLocalInputPanel({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    category: "distillate",
    supplier_name: "",
    unit: "",
    cost_zar: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.name || !form.category) {
      setError("Name and category required.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("local_inputs").insert([
      {
        name: form.name,
        category: form.category,
        supplier_name: form.supplier_name || null,
        unit: form.unit || null,
        cost_zar: form.cost_zar ? parseFloat(form.cost_zar) : null,
        notes: form.notes || null,
      },
    ]);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onSaved();
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 400,
        height: "100vh",
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        zIndex: 1000,
        overflowY: "auto",
        padding: 24,
        boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            color: C.text,
            fontWeight: 700,
            fontSize: 18,
            fontFamily: "'Cormorant Garamond', serif",
          }}
        >
          Add Local Input
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      <Input
        label="Name *"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="e.g. Distillate 1L"
      />
      <Select
        label="Category"
        value={form.category}
        onChange={(e) => set("category", e.target.value)}
      >
        <option value="distillate">Distillate</option>
        <option value="packaging">Packaging</option>
        <option value="labour">Labour</option>
        <option value="other">Other</option>
      </Select>
      <Input
        label="Supplier Name"
        value={form.supplier_name}
        onChange={(e) => set("supplier_name", e.target.value)}
        placeholder="Optional"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Cost (ZAR)"
          type="number"
          value={form.cost_zar}
          onChange={(e) => set("cost_zar", e.target.value)}
          placeholder="0.00"
        />
        <Input
          label="Unit"
          value={form.unit}
          onChange={(e) => set("unit", e.target.value)}
          placeholder="per ml / per unit"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>
          Notes
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.text,
            padding: "8px 12px",
            width: "100%",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      {error && (
        <div style={{ color: C.danger, fontSize: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}
      <button
        onClick={save}
        disabled={saving}
        style={{
          background: C.accent,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "12px 24px",
          cursor: "pointer",
          fontWeight: 600,
          width: "100%",
          fontSize: 14,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : "✓ Save Input"}
      </button>
    </div>
  );
}

// ─── Shipping Calculator ──────────────────────────────────────────────────────
function ShippingCalculator({ fx }) {
  const [mode, setMode] = useState("ddp_air");
  const [weightKg, setWeightKg] = useState("");
  const [units, setUnits] = useState("");
  const [seaRate, setSeaRate] = useState("");
  const usdZar = fx?.usd_zar || 18.5;
  let totalUSD = 0;
  if (mode === "ddp_air" && weightKg)
    totalUSD = calcDdpAir(parseFloat(weightKg));
  if (mode === "standard_air") totalUSD = 800;
  if (mode === "sea" && seaRate) totalUSD = parseFloat(seaRate);
  const totalZAR = totalUSD * usdZar;
  const perUnitZAR =
    units && parseFloat(units) > 0 ? totalZAR / parseFloat(units) : null;
  const perUnitUSD =
    units && parseFloat(units) > 0 ? totalUSD / parseFloat(units) : null;
  return (
    <Card>
      <div
        style={{
          color: C.text,
          fontWeight: 600,
          marginBottom: 16,
          fontSize: 15,
        }}
      >
        📦 Shipping Cost Calculator
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <Select
          label="Shipping Mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="ddp_air">DDP Air (per kg)</option>
          <option value="standard_air">Standard Air ($800 flat)</option>
          <option value="sea">Sea Freight</option>
        </Select>
        {mode === "ddp_air" && (
          <Input
            label="Total Weight (kg)"
            type="number"
            placeholder="e.g. 12"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        )}
        {mode === "sea" && (
          <Input
            label="Freight Cost (USD)"
            type="number"
            placeholder="e.g. 800"
            value={seaRate}
            onChange={(e) => setSeaRate(e.target.value)}
          />
        )}
        <Input
          label="Units in Shipment"
          type="number"
          placeholder="e.g. 1000"
          value={units}
          onChange={(e) => setUnits(e.target.value)}
        />
      </div>
      {totalUSD > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginTop: 8,
            padding: 16,
            background: C.bg,
            borderRadius: 6,
            border: `1px solid ${C.border}`,
          }}
        >
          {[
            { label: "Total Freight USD", value: `$${totalUSD.toFixed(2)}` },
            { label: "Total Freight ZAR", value: `R${totalZAR.toFixed(2)}` },
            perUnitZAR !== null && {
              label: "Per Unit ZAR",
              value: `R${perUnitZAR.toFixed(4)}`,
            },
            perUnitUSD !== null && {
              label: "Per Unit USD",
              value: `$${perUnitUSD.toFixed(4)}`,
            },
          ]
            .filter(Boolean)
            .map((item, i) => (
              <div key={i}>
                <div style={{ color: C.muted, fontSize: 11 }}>{item.label}</div>
                <div style={{ color: C.accent, fontWeight: 700, fontSize: 14 }}>
                  {item.value}
                </div>
              </div>
            ))}
        </div>
      )}
      <div style={{ marginTop: 12, color: C.muted, fontSize: 11 }}>
        DDP rates: ≤21kg $15.80/kg · 21–50kg $15.50/kg · 50–100kg $15.20/kg ·
        100kg+ $14.90/kg · +$25 customs clearance
      </div>
    </Card>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function HQSuppliers() {
  const { fx, loading: fxLoading, refresh: refreshFx } = useFxRate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [localInputs, setLocalInputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("catalogue");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [editProduct, setEditProduct] = useState(null); // NEW v1.2
  const [editInput, setEditInput] = useState(null);
  const [savingInput, setSavingInput] = useState(false);

  const usdZar = fx?.usd_zar || 18.5;
  const eurZar = fx?.eur_zar || 20.2;

  const toZAR = (price, currency = "USD") => {
    if (!price) return null;
    if (currency === "USD") return price * usdZar;
    if (currency === "EUR") return price * eurZar;
    if (currency === "ZAR") return price;
    return price * usdZar;
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sups }, { data: prods }, { data: inputs }] =
      await Promise.all([
        supabase
          .from("suppliers")
          .select("id, name, country, currency, contact_name")
          .order("name"),
        supabase
          .from("supplier_products")
          .select("*, suppliers(name, country, currency)")
          .eq("is_active", true)
          .order("category")
          .order("name"),
        supabase
          .from("local_inputs")
          .select("*")
          .eq("is_active", true)
          .order("category")
          .order("name"),
      ]);
    setSuppliers(sups || []);
    setProducts(prods || []);
    setLocalInputs(inputs || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = products.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (supplierFilter !== "all" && p.supplier_id !== supplierFilter)
      return false;
    return true;
  });

  const totalCatalogueZAR = filtered.reduce(
    (sum, p) => sum + (toZAR(p.unit_price_usd, p.currency) || 0),
    0,
  );
  const categoryCount = [
    "hardware",
    "terpene",
    "packaging",
    "distillate",
    "other",
  ].reduce((acc, c) => {
    acc[c] = products.filter((p) => p.category === c).length;
    return acc;
  }, {});
  const categoryColor = {
    hardware: C.info,
    terpene: C.accent,
    packaging: C.warn,
    distillate: "#7c3aed",
    other: C.muted,
  };

  const saveLocalInput = async (input) => {
    setSavingInput(true);
    await supabase
      .from("local_inputs")
      .update({
        cost_zar: input.cost_zar,
        unit: input.unit,
        supplier_name: input.supplier_name,
        notes: input.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id);
    setSavingInput(false);
    setEditInput(null);
    load();
  };

  const tabs = [
    { id: "catalogue", label: "📦 Product Catalogue" },
    { id: "local", label: "🇿🇦 Local Inputs" },
    { id: "shipping", label: "✈️ Shipping Calculator" },
    { id: "suppliers", label: "🏢 Supplier List" },
  ];

  if (loading)
    return (
      <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>
        Loading suppliers…
      </div>
    );

  return (
    <div style={{ color: C.text, fontFamily: T.font }}>
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
          <h2
            style={{
              color: C.primaryDark,
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              fontFamily: T.font,
            }}
          >
            Supplier Catalogue
          </h2>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {products.length} products · {suppliers.length} suppliers · Live
            USD/ZAR pricing
          </div>
        </div>
        <button
          onClick={() => setShowAddProduct(true)}
          style={{
            background: C.accent,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 18px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          + Add Product
        </button>
      </div>

      {/* FX Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 16px",
          background: C.primaryDark,
          border: `1px solid ${C.primaryDark}`,
          borderRadius: 6,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: fxLoading ? C.warn : "#52b788",
              display: "inline-block",
            }}
          />
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
            Live FX
          </span>
        </div>
        <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 15 }}>
          USD/ZAR: {fxLoading ? "…" : `R${usdZar.toFixed(4)}`}
        </span>
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
          EUR/ZAR: {fxLoading ? "…" : `R${eurZar.toFixed(4)}`}
        </span>
        {fx?.fetched_at && (
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
            {fx.source === "cache"
              ? "(cached)"
              : fx.source === "stale_cache"
                ? "(stale)"
                : "(live)"}{" "}
            · Updated {new Date(fx.fetched_at).toLocaleTimeString("en-ZA")}
          </span>
        )}
        <button
          onClick={refreshFx}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 4,
            color: "rgba(255,255,255,0.8)",
            fontSize: 11,
            padding: "2px 8px",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {["hardware", "terpene", "packaging", "distillate", "other"].map(
          (cat) => (
            <div
              key={cat}
              onClick={() =>
                setCategoryFilter(categoryFilter === cat ? "all" : cat)
              }
              style={{
                background: C.surface,
                border:
                  categoryFilter === cat
                    ? `2px solid ${categoryColor[cat]}`
                    : `1px solid ${C.border}`,
                borderLeft: `3px solid ${categoryColor[cat]}`,
                borderRadius: 6,
                padding: 14,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: T.ink400,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  fontFamily: T.font,
                }}
              >
                {cat}
              </div>
              <div
                style={{
                  color: categoryColor[cat],
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: T.font,
                }}
              >
                {categoryCount[cat]}
              </div>
              <div style={{ color: C.muted, fontSize: 11 }}>products</div>
            </div>
          ),
        )}
      </div>

      {/* Sub-tab nav */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === t.id
                  ? `2px solid ${C.accent}`
                  : "2px solid transparent",
              color: activeTab === t.id ? C.accent : C.muted,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === t.id ? 700 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CATALOGUE TAB ─────────────────────────────────────────────────── */}
      {activeTab === "catalogue" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.text,
                padding: "6px 12px",
                fontSize: 13,
              }}
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.text,
                padding: "6px 12px",
                fontSize: 13,
              }}
            >
              <option value="all">All Categories</option>
              <option value="hardware">Hardware</option>
              <option value="terpene">Terpene</option>
              <option value="packaging">Packaging</option>
              <option value="distillate">Distillate</option>
              <option value="other">Other</option>
            </select>
            <div
              style={{
                marginLeft: "auto",
                color: C.muted,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
              }}
            >
              {filtered.length} products shown
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                  {[
                    "Category",
                    "SKU",
                    "Product",
                    "Supplier",
                    "Unit Price USD",
                    "ZAR (live)",
                    "MOQ",
                    "Weight/unit",
                    "Lead Time",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        color: C.muted,
                        fontWeight: 600,
                        padding: "8px 12px",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const zarPrice = toZAR(p.unit_price_usd, p.currency);
                  const missingPrice = !p.unit_price_usd;
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: missingPrice ? "#fffbf0" : "transparent",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = missingPrice
                          ? "#fff5e0"
                          : C.bg)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = missingPrice
                          ? "#fffbf0"
                          : "transparent")
                      }
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <Badge
                          label={p.category}
                          color={categoryColor[p.category] || C.muted}
                          bg={`${categoryColor[p.category]}18` || C.infoDim}
                        />
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: C.muted,
                          fontFamily: "monospace",
                          fontSize: 11,
                        }}
                      >
                        {p.sku || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: C.text,
                          fontWeight: 500,
                        }}
                      >
                        {p.name}
                        {p.description && p.description.length > 0 && (
                          <div
                            style={{
                              color: C.muted,
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            {p.description.slice(0, 60)}
                            {p.description.length > 60 ? "…" : ""}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", color: C.muted }}>
                        {p.suppliers?.name || "—"}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: C.text,
                          fontWeight: 600,
                        }}
                      >
                        {p.unit_price_usd ? (
                          `${p.currency} ${parseFloat(p.unit_price_usd).toFixed(4)}`
                        ) : (
                          <span style={{ color: C.warn, fontSize: 11 }}>
                            ⚠ Not set
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: C.accent,
                          fontWeight: 700,
                        }}
                      >
                        {zarPrice ? `R${zarPrice.toFixed(4)}` : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: C.muted }}>
                        {p.moq?.toLocaleString() || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: C.muted }}>
                        {p.weight_kg_per_unit
                          ? `${p.weight_kg_per_unit}kg`
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", color: C.muted }}>
                        {p.lead_time_days ? `${p.lead_time_days}d` : "—"}
                      </td>
                      <td
                        style={{ padding: "10px 12px", whiteSpace: "nowrap" }}
                      >
                        {/* EDIT BUTTON — NEW v1.2 */}
                        <button
                          onClick={() => setEditProduct(p)}
                          style={{
                            background: missingPrice ? C.accent : "none",
                            border: `1px solid ${missingPrice ? C.accent : C.border}`,
                            color: missingPrice ? "#fff" : C.muted,
                            borderRadius: 4,
                            padding: "3px 10px",
                            cursor: "pointer",
                            fontSize: 11,
                            marginRight: 6,
                            fontWeight: missingPrice ? 600 : 400,
                          }}
                        >
                          {missingPrice ? "⚠ Set Price" : "Edit"}
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm(`Deactivate "${p.name}"?`))
                              return;
                            await supabase
                              .from("supplier_products")
                              .update({ is_active: false })
                              .eq("id", p.id);
                            load();
                          }}
                          style={{
                            background: "none",
                            border: `1px solid ${C.border}`,
                            color: C.muted,
                            borderRadius: 4,
                            padding: "2px 8px",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        textAlign: "center",
                        color: C.muted,
                        padding: 40,
                      }}
                    >
                      No products match filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div
              style={{
                textAlign: "right",
                color: C.muted,
                fontSize: 12,
                marginTop: 12,
              }}
            >
              Total catalogue value (filtered):{" "}
              <span style={{ color: C.accent, fontWeight: 600 }}>
                R{totalCatalogueZAR.toFixed(2)}
              </span>
              <span style={{ color: C.muted }}> at current USD/ZAR rate</span>
            </div>
          )}
        </div>
      )}

      {/* ── LOCAL INPUTS TAB ──────────────────────────────────────────────── */}
      {activeTab === "local" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div style={{ color: C.muted, fontSize: 13 }}>
              ZAR input costs for distillate, packaging, and labour — used in
              COGS calculations.
            </div>
            <button
              onClick={() => setShowAddInput(true)}
              style={{
                background: C.accent,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "7px 16px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              + Add Input
            </button>
          </div>
          {["distillate", "packaging", "labour", "other"].map((cat) => {
            const items = localInputs.filter((i) => i.category === cat);
            if (items.length === 0) return null;
            return (
              <Card key={cat}>
                <div
                  style={{
                    color: C.text,
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 12,
                    textTransform: "capitalize",
                  }}
                >
                  {cat}
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {[
                        "Name",
                        "Supplier",
                        "Cost (ZAR)",
                        "Unit",
                        "Notes",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            color: C.muted,
                            fontWeight: 600,
                            padding: "6px 10px",
                            textAlign: "left",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        style={{ borderBottom: `1px solid ${C.border}` }}
                      >
                        {editInput?.id === item.id ? (
                          <>
                            <td style={{ padding: "8px 10px", color: C.text }}>
                              {item.name}
                            </td>
                            <td style={{ padding: "4px 10px" }}>
                              <input
                                value={editInput.supplier_name || ""}
                                onChange={(e) =>
                                  setEditInput((p) => ({
                                    ...p,
                                    supplier_name: e.target.value,
                                  }))
                                }
                                style={{
                                  background: C.bg,
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 4,
                                  color: C.text,
                                  padding: "4px 8px",
                                  width: 140,
                                  fontSize: 12,
                                }}
                              />
                            </td>
                            <td style={{ padding: "4px 10px" }}>
                              <input
                                type="number"
                                value={editInput.cost_zar || ""}
                                onChange={(e) =>
                                  setEditInput((p) => ({
                                    ...p,
                                    cost_zar: e.target.value,
                                  }))
                                }
                                style={{
                                  background: C.bg,
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 4,
                                  color: C.text,
                                  padding: "4px 8px",
                                  width: 80,
                                  fontSize: 12,
                                }}
                              />
                            </td>
                            <td style={{ padding: "4px 10px" }}>
                              <input
                                value={editInput.unit || ""}
                                onChange={(e) =>
                                  setEditInput((p) => ({
                                    ...p,
                                    unit: e.target.value,
                                  }))
                                }
                                style={{
                                  background: C.bg,
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 4,
                                  color: C.text,
                                  padding: "4px 8px",
                                  width: 120,
                                  fontSize: 12,
                                }}
                              />
                            </td>
                            <td style={{ padding: "4px 10px" }}>
                              <input
                                value={editInput.notes || ""}
                                onChange={(e) =>
                                  setEditInput((p) => ({
                                    ...p,
                                    notes: e.target.value,
                                  }))
                                }
                                style={{
                                  background: C.bg,
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 4,
                                  color: C.text,
                                  padding: "4px 8px",
                                  width: "100%",
                                  fontSize: 12,
                                }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "4px 10px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <button
                                onClick={() => saveLocalInput(editInput)}
                                disabled={savingInput}
                                style={{
                                  background: C.accent,
                                  border: "none",
                                  color: "#fff",
                                  borderRadius: 4,
                                  padding: "3px 10px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                  marginRight: 4,
                                }}
                              >
                                {savingInput ? "…" : "Save"}
                              </button>
                              <button
                                onClick={() => setEditInput(null)}
                                style={{
                                  background: "none",
                                  border: `1px solid ${C.border}`,
                                  color: C.muted,
                                  borderRadius: 4,
                                  padding: "3px 8px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                }}
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td
                              style={{
                                padding: "10px 10px",
                                color: C.text,
                                fontWeight: 500,
                              }}
                            >
                              {item.name}
                            </td>
                            <td
                              style={{ padding: "10px 10px", color: C.muted }}
                            >
                              {item.supplier_name || "—"}
                            </td>
                            <td style={{ padding: "10px 10px" }}>
                              {item.cost_zar ? (
                                <span
                                  style={{ color: C.accent, fontWeight: 700 }}
                                >
                                  R{parseFloat(item.cost_zar).toFixed(2)}
                                </span>
                              ) : (
                                <span style={{ color: C.danger, fontSize: 11 }}>
                                  ⚠ Not set
                                </span>
                              )}
                            </td>
                            <td
                              style={{ padding: "10px 10px", color: C.muted }}
                            >
                              {item.unit || "—"}
                            </td>
                            <td
                              style={{
                                padding: "10px 10px",
                                color: C.muted,
                                fontSize: 12,
                              }}
                            >
                              {item.notes || "—"}
                            </td>
                            <td style={{ padding: "10px 10px" }}>
                              <button
                                onClick={() => setEditInput({ ...item })}
                                style={{
                                  background: "none",
                                  border: `1px solid ${C.border}`,
                                  color: C.muted,
                                  borderRadius: 4,
                                  padding: "2px 8px",
                                  cursor: "pointer",
                                  fontSize: 11,
                                }}
                              >
                                Edit
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            );
          })}
          <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
            ⚠ Items marked "Not set" will be excluded from COGS calculations
            until a price is entered.
          </div>
        </div>
      )}

      {/* ── SHIPPING CALCULATOR TAB ───────────────────────────────────────── */}
      {activeTab === "shipping" && (
        <div>
          <ShippingCalculator fx={fx} />
          <Card>
            <div style={{ color: C.text, fontWeight: 600, marginBottom: 12 }}>
              📋 DDP Air Rate Card
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {[
                    "Weight Bracket",
                    "Rate per kg (USD)",
                    "Example: 10kg (USD)",
                    "Example ZAR",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        color: C.muted,
                        fontWeight: 600,
                        padding: "6px 12px",
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "≤ 21 kg", rate: 15.8 },
                  { label: "21 – 50 kg", rate: 15.5 },
                  { label: "50 – 100 kg", rate: 15.2 },
                  { label: "100 kg +", rate: 14.9 },
                ].map((row) => {
                  const ex = 10 * row.rate + DDP_CLEARANCE_USD;
                  return (
                    <tr
                      key={row.label}
                      style={{ borderBottom: `1px solid ${C.border}` }}
                    >
                      <td style={{ padding: "8px 12px", color: C.text }}>
                        {row.label}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color: C.accent,
                          fontWeight: 600,
                        }}
                      >
                        ${row.rate}
                      </td>
                      <td style={{ padding: "8px 12px", color: C.muted }}>
                        ${ex.toFixed(2)} (incl. $25 clearance)
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          color: C.gold,
                          fontWeight: 600,
                        }}
                      >
                        R{(ex * usdZar).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── SUPPLIER LIST TAB ─────────────────────────────────────────────── */}
      {activeTab === "suppliers" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div style={{ color: C.muted, fontSize: 13 }}>
              {suppliers.length} suppliers registered · any sector
            </div>
            <button
              onClick={() => setShowAddSupplier(true)}
              style={{
                background: C.accent,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 18px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              + Add Supplier
            </button>
          </div>
          {suppliers.length === 0 ? (
            <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>
              No suppliers yet.
            </div>
          ) : (
            suppliers.map((s) => {
              const sProds = products.filter((p) => p.supplier_id === s.id);
              const categories = [...new Set(sProds.map((p) => p.category))];
              return (
                <Card key={s.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: C.text,
                          fontWeight: 700,
                          fontSize: 15,
                          fontFamily: "'Cormorant Garamond', serif",
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{ color: C.muted, fontSize: 12, marginTop: 2 }}
                      >
                        {s.country} · {s.currency}
                        {s.contact_name && ` · ${s.contact_name}`}
                      </div>
                      {categories.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            marginTop: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {categories.map((cat) => (
                            <Badge
                              key={cat}
                              label={cat}
                              color={categoryColor[cat] || C.muted}
                              bg={`${categoryColor[cat]}18` || C.infoDim}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          color: C.accent,
                          fontWeight: 700,
                          fontSize: 20,
                          fontFamily: "'Cormorant Garamond', serif",
                        }}
                      >
                        {sProds.length}
                      </div>
                      <div style={{ color: C.muted, fontSize: 11 }}>
                        products
                      </div>
                    </div>
                  </div>
                  {sProds.length > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {sProds.slice(0, 8).map((p) => (
                        <span
                          key={p.id}
                          style={{
                            background: C.bg,
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            padding: "3px 8px",
                            fontSize: 11,
                            color: C.muted,
                          }}
                        >
                          {p.name}
                          {p.unit_price_usd && (
                            <span
                              style={{
                                color: C.accent,
                                marginLeft: 6,
                                fontWeight: 600,
                              }}
                            >
                              {p.currency}{" "}
                              {parseFloat(p.unit_price_usd).toFixed(2)}
                            </span>
                          )}
                        </span>
                      ))}
                      {sProds.length > 8 && (
                        <span
                          style={{
                            color: C.muted,
                            fontSize: 11,
                            padding: "3px 8px",
                          }}
                        >
                          +{sProds.length - 8} more
                        </span>
                      )}
                    </div>
                  )}
                  {sProds.length === 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        color: C.muted,
                        fontSize: 12,
                        fontStyle: "italic",
                      }}
                    >
                      No products catalogued yet.
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── Slide-in panels ───────────────────────────────────────────────── */}
      {showAddProduct && (
        <AddProductPanel
          suppliers={suppliers}
          onClose={() => setShowAddProduct(false)}
          onSaved={() => {
            setShowAddProduct(false);
            load();
          }}
        />
      )}
      {showAddSupplier && (
        <AddSupplierPanel
          onClose={() => setShowAddSupplier(false)}
          onSaved={() => {
            setShowAddSupplier(false);
            load();
          }}
        />
      )}
      {showAddInput && (
        <AddLocalInputPanel
          onClose={() => setShowAddInput(false)}
          onSaved={() => {
            setShowAddInput(false);
            load();
          }}
        />
      )}

      {/* EDIT PRODUCT PANEL — NEW v1.2 */}
      {editProduct && (
        <EditProductPanel
          product={editProduct}
          suppliers={suppliers}
          onClose={() => setEditProduct(null)}
          onSaved={() => {
            setEditProduct(null);
            load();
          }}
        />
      )}
    </div>
  );
}
