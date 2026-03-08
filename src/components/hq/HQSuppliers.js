// src/components/hq/HQSuppliers.js — v1.0
// Protea Botanicals — WP-A Supplier Catalogue & FX Engine
// HQ-only view: supplier product catalogue + live USD/ZAR + shipping calculator + local inputs
// DO NOT render in Admin or Retailer views — HQ only

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";

// ─── Colour tokens (match existing HQ style) ─────────────────────────────────
const C = {
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  text: "#e6edf3",
  muted: "#8b949e",
  accent: "#4fa94d",
  accentDim: "#1e3a1e",
  warn: "#d29922",
  warnDim: "#2d2007",
  danger: "#f85149",
  dangerDim: "#3d1a1a",
  info: "#388bfd",
  infoDim: "#0d2045",
  gold: "#e3b341",
};

// ─── DDP Air rate tiers (from WhatsApp shipping quote) ───────────────────────
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

// ─── useFxRate hook ───────────────────────────────────────────────────────────
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

// ─── Pill badge ───────────────────────────────────────────────────────────────
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

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
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

// ─── Shipping Calculator panel ────────────────────────────────────────────────
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

  const modeLabels = {
    ddp_air: "DDP Air (per kg)",
    standard_air: "Standard Air ($800 flat)",
    sea: "Sea Freight (custom rate)",
  };

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
            { label: "Mode", value: modeLabels[mode] },
            { label: "Total Freight USD", value: `$${totalUSD.toFixed(2)}` },
            { label: "Total Freight ZAR", value: `R${totalZAR.toFixed(2)}` },
            perUnitZAR !== null && {
              label: "Shipping per Unit ZAR",
              value: `R${perUnitZAR.toFixed(4)}`,
            },
            perUnitUSD !== null && {
              label: "Shipping per Unit USD",
              value: `$${perUnitUSD.toFixed(4)}`,
            },
            mode === "ddp_air" &&
              weightKg && {
                label: "Rate Applied",
                value: `$${DDP_TIERS.find((t) => parseFloat(weightKg) <= t.maxKg)?.ratePerKg}/kg + $${DDP_CLEARANCE_USD} clearance`,
              },
          ]
            .filter(Boolean)
            .map((item, i) => (
              <div key={i}>
                <div style={{ color: C.muted, fontSize: 11 }}>{item.label}</div>
                <div style={{ color: C.accent, fontWeight: 600, fontSize: 14 }}>
                  {item.value}
                </div>
              </div>
            ))}
        </div>
      )}

      <div style={{ marginTop: 12, color: C.muted, fontSize: 11 }}>
        DDP rates: ≤21kg $15.80/kg · 21–50kg $15.50/kg · 50–100kg $15.20/kg ·
        100kg+ $14.90/kg · +$25 customs clearance · Max 350kg/CBM · Sea min 1
        CBM
      </div>
    </Card>
  );
}

// ─── Add Product slide-in panel ───────────────────────────────────────────────
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
    const payload = {
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
    };
    const { error: err } = await supabase
      .from("supplier_products")
      .insert([payload]);
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
        <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>
          Add Supplier Product
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 20,
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
          <option value="CNY">CNY</option>
          <option value="ZAR">ZAR</option>
        </Select>
        <Input
          label="MOQ (min order qty)"
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
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>
          Notes
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Optional supplier notes"
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
          padding: "10px 24px",
          cursor: "pointer",
          fontWeight: 600,
          width: "100%",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : "Save Product"}
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
        <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>
          Add Local Input
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: C.muted,
            fontSize: 20,
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
          placeholder="per ml / per unit / per hour"
        />
      </div>
      <div style={{ marginBottom: 12 }}>
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
            fontSize: 14,
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
          padding: "10px 24px",
          cursor: "pointer",
          fontWeight: 600,
          width: "100%",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : "Save Input"}
      </button>
    </div>
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
  const [showAddInput, setShowAddInput] = useState(false);
  const [editInput, setEditInput] = useState(null);
  const [savingInput, setSavingInput] = useState(false);

  const usdZar = fx?.usd_zar || 18.5;
  const eurZar = fx?.eur_zar || 20.2;

  const toZAR = (price, currency = "USD") => {
    if (!price) return null;
    if (currency === "USD") return price * usdZar;
    if (currency === "EUR") return price * eurZar;
    if (currency === "ZAR") return price;
    return price * usdZar; // default
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

  // Filtered products
  const filtered = products.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (supplierFilter !== "all" && p.supplier_id !== supplierFilter)
      return false;
    return true;
  });

  // Stats
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
    distillate: "#a78bfa",
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

  // ── FX status bar ──────────────────────────────────────────────────────────
  const FxBar = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 16px",
        background: C.accentDim,
        border: `1px solid ${C.accent}`,
        borderRadius: 8,
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
            background: fxLoading ? C.warn : C.accent,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span style={{ color: C.muted, fontSize: 12 }}>Live FX</span>
      </div>
      <span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>
        USD/ZAR: {fxLoading ? "…" : `R${usdZar.toFixed(4)}`}
      </span>
      <span style={{ color: C.muted, fontSize: 13 }}>
        EUR/ZAR: {fxLoading ? "…" : `R${eurZar.toFixed(4)}`}
      </span>
      {fx?.fetched_at && (
        <span style={{ color: C.muted, fontSize: 11 }}>
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
          border: `1px solid ${C.accent}`,
          borderRadius: 4,
          color: C.accent,
          fontSize: 11,
          padding: "2px 8px",
          cursor: "pointer",
          marginLeft: "auto",
        }}
      >
        ↻ Refresh
      </button>
    </div>
  );

  // ── Sub-tabs ───────────────────────────────────────────────────────────────
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
    <div style={{ color: C.text, fontFamily: "Jost, sans-serif" }}>
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
            style={{ color: C.text, margin: 0, fontSize: 22, fontWeight: 700 }}
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

      <FxBar />

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
            <Card
              key={cat}
              style={{
                margin: 0,
                padding: 14,
                cursor: "pointer",
                border:
                  categoryFilter === cat
                    ? `1px solid ${categoryColor[cat]}`
                    : `1px solid ${C.border}`,
              }}
              onClick={() =>
                setCategoryFilter(categoryFilter === cat ? "all" : cat)
              }
            >
              <div
                style={{
                  color: C.muted,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {cat}
              </div>
              <div
                style={{
                  color: categoryColor[cat],
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {categoryCount[cat]}
              </div>
              <div style={{ color: C.muted, fontSize: 11 }}>products</div>
            </Card>
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
          paddingBottom: 0,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? C.surface : "transparent",
              border: "none",
              borderBottom:
                activeTab === t.id
                  ? `2px solid ${C.accent}`
                  : "2px solid transparent",
              color: activeTab === t.id ? C.text : C.muted,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CATALOGUE TAB ───────────────────────────────────────────────────── */}
      {activeTab === "catalogue" && (
        <div>
          {/* Filters */}
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

          {/* Product table */}
          <div style={{ overflowX: "auto" }}>
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
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = C.surface)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <Badge
                          label={p.category}
                          color={categoryColor[p.category] || C.muted}
                          bg={C.bg}
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
                        {p.notes && (
                          <div
                            style={{
                              color: C.muted,
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            {p.notes.slice(0, 60)}
                            {p.notes.length > 60 ? "…" : ""}
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
                        {p.unit_price_usd
                          ? `${p.currency} ${parseFloat(p.unit_price_usd).toFixed(4)}`
                          : "—"}
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
                      <td style={{ padding: "10px 12px" }}>
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

          {/* Summary */}
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

      {/* ── LOCAL INPUTS TAB ─────────────────────────────────────────────────── */}
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

      {/* ── SHIPPING CALCULATOR TAB ───────────────────────────────────────────── */}
      {activeTab === "shipping" && (
        <div>
          <ShippingCalculator fx={fx} />

          {/* Rate card reference */}
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
                    "Example: 10kg shipment (USD)",
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
                  const example10 = 10 * row.rate + DDP_CLEARANCE_USD;
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
                        ${example10.toFixed(2)} (incl. $25 clearance)
                      </td>
                      <td style={{ padding: "8px 12px", color: C.gold }}>
                        R{(example10 * usdZar).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
              Sea freight: $650/CBM self-pickup JHB · +$150/CBM door delivery ·
              Min 1 CBM ($800 total) · 350kg max per CBM · 45–55 day transit
            </div>
          </Card>
        </div>
      )}

      {/* ── SUPPLIER LIST TAB ─────────────────────────────────────────────────── */}
      {activeTab === "suppliers" && (
        <div>
          {suppliers.map((s) => {
            const sProds = products.filter((p) => p.supplier_id === s.id);
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
                      style={{ color: C.text, fontWeight: 700, fontSize: 15 }}
                    >
                      {s.name}
                    </div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                      {s.country} · {s.currency} ·{" "}
                      {s.contact_name || "No contact on file"}
                    </div>
                  </div>
                  <Badge
                    label={`${sProds.length} products`}
                    color={C.info}
                    bg={C.infoDim}
                  />
                </div>

                {sProds.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {sProds.map((p) => (
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
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          {suppliers.length === 0 && (
            <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>
              No suppliers found. Add suppliers via the Supply Chain tab first.
            </div>
          )}
        </div>
      )}

      {/* ── Slide-in panels ─────────────────────────────────────────────────── */}
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
      {showAddInput && (
        <AddLocalInputPanel
          onClose={() => setShowAddInput(false)}
          onSaved={() => {
            setShowAddInput(false);
            load();
          }}
        />
      )}
    </div>
  );
}
