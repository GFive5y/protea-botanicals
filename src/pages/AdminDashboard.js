// AdminDashboard.js v3.6 — Smart QR Tab + Analytics Tab
// Protea Botanicals — February 28 2026
// ★ v3.6 changes (3 only — same pattern as AdminQrGenerator):
//   1. ADD: import AdminAnalytics
//   2. ADD: "Analytics" TabBtn in tab navigation
//   3. ADD: "analytics" tab content rendering <AdminAnalytics />
//   NO OTHER CHANGES.
//
// ★ v3.5 changes (3 only):
//   1. ADD: import AdminQrGenerator from "./AdminQrGenerator"
//   2. ADD: "Smart QR" TabBtn in tab navigation
//   3. ADD: "smart_qr" tab content rendering <AdminQrGenerator />
//   NO OTHER CHANGES. All existing tabs, CRUD, bulk generator, analytics untouched.
//
// v3.4 changes:
//   1. REMOVED: ADMIN_PASSWORD, authed state, pw state, handleLogin, password gate UI
//   2. REMOVED: Internal green header with redundant LOG OUT (NavBar handles this)
//   3. REMOVED: `if (!authed) return;` guards on useEffects — data loads on mount
//   4. REMOVED: minHeight/background on outer wrapper (PageShell provides these)
//   5. KEPT: ALL tabs, CRUD, bulk generator, analytics, CSV export, QR download, modals
// v3.3 fixes preserved: React import, 'revoked' status filter
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabaseClient";
import { QRCodeSVG } from "qrcode.react";
// ★ v3.5: Import Smart QR Generator component
import AdminQrGenerator from "./AdminQrGenerator";
// ★ v3.6: Import Analytics component
import AdminAnalytics from "./AdminAnalytics";
// ─── Design Tokens (from tokens.js v2) ───
const C = {
  green: "#1b4332",
  mid: "#2d6a4f",
  accent: "#52b788",
  gold: "#b5935a",
  blue: "#2c4a6e",
  brown: "#7c3a10",
  orange: "#e67e22",
  cream: "#faf9f6",
  footer: "#1a1a1a",
  border: "#e0dbd2",
  muted: "#888",
  white: "#fff",
  red: "#c0392b",
  lightGreen: "#d4edda",
  lightRed: "#f8d7da",
  lightBlue: "#d6eaf8",
  lightGold: "#fef9e7",
};
const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};
const makeBtn = (bg, color = C.white) => ({
  background: bg,
  color,
  border: "none",
  borderRadius: "2px",
  padding: "10px 20px",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontFamily: FONTS.body,
  cursor: "pointer",
  transition: "opacity 0.2s",
});
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${C.border}`,
  borderRadius: "2px",
  fontSize: "14px",
  fontFamily: FONTS.body,
  background: C.white,
  boxSizing: "border-box",
};
const labelStyle = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: C.muted,
  marginBottom: "4px",
  display: "block",
  fontFamily: FONTS.body,
};
// ─── Constants ───
const PAGE_SIZE = 50;
const QR_TYPES = ["product", "promo", "voucher"];
const STATUSES = ["in_stock", "distributed", "claimed", "revoked"];
const STATUS_COLORS = {
  in_stock: C.blue,
  distributed: C.gold,
  claimed: C.accent,
  revoked: C.red,
};
const STATUS_LABELS = {
  in_stock: "In Stock",
  distributed: "Distributed",
  claimed: "Claimed",
  revoked: "Revoked",
};
const QR_TYPE_COLORS = { product: C.green, promo: C.gold, voucher: C.blue };
const SITE_URL = "https://protea-botanicals.netlify.app"; // Change for production domain
// ─── Helper: safe DOM id from QR code string ───
function safeId(qrCode) {
  return qrCode.replace(/[^a-zA-Z0-9]/g, "_");
}
// ─── Helper: Status Badge ───
function StatusBadge({ status }) {
  const bg = STATUS_COLORS[status] || C.muted;
  return (
    <span
      style={{
        background: bg,
        color: C.white,
        padding: "3px 10px",
        borderRadius: "2px",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: FONTS.body,
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
// ─── Helper: QR Type Badge ───
function TypeBadge({ type }) {
  const bg = QR_TYPE_COLORS[type] || C.muted;
  return (
    <span
      style={{
        background: bg,
        color: C.white,
        padding: "3px 10px",
        borderRadius: "2px",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: FONTS.body,
      }}
    >
      {type}
    </span>
  );
}
// ─── Helper: Stat Card ───
function StatCard({ label, value, sub, color = C.green, icon }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: "2px",
        padding: "20px",
        flex: "1 1 200px",
        minWidth: "180px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: C.muted,
          fontFamily: FONTS.body,
          marginBottom: "8px",
        }}
      >
        {icon && <span style={{ marginRight: "6px" }}>{icon}</span>}
        {label}
      </div>
      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          color,
          fontFamily: FONTS.heading,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "12px",
            color: C.muted,
            fontFamily: FONTS.body,
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
// ─── Helper: Tab Button ───
function TabBtn({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...makeBtn(
          active ? C.green : "transparent",
          active ? C.white : C.green,
        ),
        borderBottom: active
          ? `3px solid ${C.accent}`
          : "3px solid transparent",
        borderRadius: 0,
        padding: "12px 20px",
      }}
    >
      {label}
    </button>
  );
}
// ─── Helper: format date ───
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  // ─── Navigation ───
  const [tab, setTab] = useState("overview");
  // ─── Data ───
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stockists, setStockists] = useState([]);
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // ─── Pagination ───
  const [page, setPage] = useState(0);
  // ─── Filters ───
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterStockist, setFilterStockist] = useState("all");
  // ─── Modals ───
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  // ─── Bulk Generator State ───
  const [bulkBatch, setBulkBatch] = useState("");
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkType, setBulkType] = useState("product");
  const [bulkPoints, setBulkPoints] = useState(10);
  const [bulkStockist, setBulkStockist] = useState("");
  const [bulkExpiry, setBulkExpiry] = useState("");
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  // ─── Create/Edit Form ───
  const [formQrCode, setFormQrCode] = useState("");
  const [formBatchId, setFormBatchId] = useState("");
  const [formType, setFormType] = useState("product");
  const [formPoints, setFormPoints] = useState(10);
  const [formStockist, setFormStockist] = useState("");
  const [formExpiry, setFormExpiry] = useState("");
  const [formActive, setFormActive] = useState(true);
  // ─── Analytics ───
  const [analytics, setAnalytics] = useState({
    total: 0,
    claimed: 0,
    unclaimed: 0,
    distributed: 0,
    claimRate: 0,
    totalPointsDistributed: 0,
    activeStockists: 0,
    avgTimeToClaim: null,
    userCount: 0,
  });
  // ─── QR Download Ref (hidden container outside table for performance) ───
  const qrContainerRef = useRef(null);
  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════
  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .order("batch_number", { ascending: true });
    if (error) console.error("fetchBatches error:", error);
    setBatches(data || []);
  }, []);
  const fetchStockists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("wholesale_partners")
        .select("id, business_name, contact_name");
      // PGRST205 = table not found in schema cache — safe to skip
      if (error) {
        if (error.code === "PGRST205") {
          console.warn(
            "wholesale_partners table not available — skipping stockists",
          );
        } else {
          console.error("fetchStockists error:", error);
        }
        setStockists([]);
        return;
      }
      setStockists(data || []);
    } catch (err) {
      console.warn("fetchStockists exception — skipping:", err.message);
      setStockists([]);
    }
  }, []);
  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from("user_profiles").select("*");
    if (error) console.error("fetchUsers error:", error);
    setUsers(data || []);
  }, []);
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let query = supabase
        .from("products")
        .select("*, batches(batch_number, product_name, strain)", {
          count: "exact",
        });
      if (searchTerm) query = query.ilike("qr_code", `%${searchTerm}%`);
      if (filterStatus !== "all") {
        if (filterStatus === "revoked") query = query.eq("is_active", false);
        else query = query.eq("status", filterStatus);
      }
      if (filterType !== "all") query = query.eq("qr_type", filterType);
      if (filterBatch !== "all") query = query.eq("batch_id", filterBatch);
      if (filterStockist !== "all")
        query = query.eq("stockist_id", filterStockist);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.order("qr_code", { ascending: false }).range(from, to);
      const { data, count, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Fetch products error:", err);
      setError("Failed to load QR codes. Check console for details.");
    }
    setLoading(false);
  }, [searchTerm, filterStatus, filterType, filterBatch, filterStockist, page]);
  const computeAnalytics = useCallback(async () => {
    try {
      const { count: total } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      const { count: claimed } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "claimed");
      const { count: distributed } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "distributed");
      const { count: inStock } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_stock");
      const unclaimed = (total || 0) - (claimed || 0);
      const claimRate =
        total > 0 ? (((claimed || 0) / total) * 100).toFixed(1) : 0;
      // Points distributed (sum of points_value for claimed codes)
      const { data: pointsData } = await supabase
        .from("products")
        .select("points_value")
        .eq("status", "claimed");
      const totalPointsDistributed = (pointsData || []).reduce(
        (sum, p) => sum + (p.points_value || 10),
        0,
      );
      // Active stockists
      const { data: stockistData } = await supabase
        .from("products")
        .select("stockist_id")
        .not("stockist_id", "is", null);
      const activeStockists = new Set(
        (stockistData || []).map((p) => p.stockist_id),
      ).size;
      // Average time to claim (uses claimed_at column from migration)
      const { data: timeData } = await supabase
        .from("products")
        .select("distributed_at, claimed_at")
        .eq("status", "claimed")
        .not("distributed_at", "is", null)
        .not("claimed_at", "is", null);
      let avgTimeToClaim = null;
      if (timeData && timeData.length > 0) {
        const totalHours = timeData.reduce((sum, p) => {
          const diff = new Date(p.claimed_at) - new Date(p.distributed_at);
          return sum + diff / (1000 * 60 * 60);
        }, 0);
        avgTimeToClaim = (totalHours / timeData.length).toFixed(1);
      }
      const { count: userCount } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true });
      setAnalytics({
        total: total || 0,
        claimed: claimed || 0,
        unclaimed,
        inStock: inStock || 0,
        distributed: distributed || 0,
        claimRate,
        totalPointsDistributed,
        activeStockists,
        avgTimeToClaim,
        userCount: userCount || 0,
      });
    } catch (err) {
      console.error("Analytics error:", err);
    }
  }, []);
  // ─── Initial Load — v3.4: no auth gate, loads immediately ───
  useEffect(() => {
    fetchBatches();
    fetchStockists();
    fetchUsers();
    computeAnalytics();
  }, [fetchBatches, fetchStockists, fetchUsers, computeAnalytics]);
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => {
    setPage(0);
  }, [searchTerm, filterStatus, filterType, filterBatch, filterStockist]);
  // ═══════════════════════════════════════════════════════════════
  // BULK QR GENERATOR
  // ═══════════════════════════════════════════════════════════════
  const getNextSequence = async (batchNumber) => {
    const { data } = await supabase
      .from("products")
      .select("qr_code")
      .ilike("qr_code", `${batchNumber}-%`)
      .order("qr_code", { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return 1;
    const lastCode = data[0].qr_code;
    const lastSeq = parseInt(lastCode.split("-").pop(), 10);
    return isNaN(lastSeq) ? 1 : lastSeq + 1;
  };
  const handleBulkGenerate = async () => {
    if (!bulkBatch) {
      setError("Please select a batch");
      return;
    }
    setBulkGenerating(true);
    setError("");
    setBulkResult(null);
    try {
      const batch = batches.find((b) => b.id === bulkBatch);
      if (!batch) throw new Error("Batch not found");
      const batchNumber = batch.batch_number;
      const startSeq = await getNextSequence(batchNumber);
      const codes = [];
      for (let i = 0; i < bulkCount; i++) {
        const seq = String(startSeq + i).padStart(4, "0");
        const qrCode = `${batchNumber}-${seq}`;
        codes.push({
          qr_code: qrCode,
          batch_id: bulkBatch,
          qr_type: bulkType,
          points_value: bulkType === "product" ? 10 : bulkPoints,
          stockist_id: bulkStockist || null,
          status: bulkStockist ? "distributed" : "in_stock",
          distributed_at: bulkStockist ? new Date().toISOString() : null,
          expires_at: bulkExpiry || null,
          is_active: true,
          claimed: false,
        });
      }
      const { data, error: insertErr } = await supabase
        .from("products")
        .insert(codes)
        .select();
      if (insertErr) throw insertErr;
      setBulkResult({
        count: data.length,
        batchNumber,
        firstCode: codes[0].qr_code,
        lastCode: codes[codes.length - 1].qr_code,
      });
      fetchProducts();
      computeAnalytics();
    } catch (err) {
      console.error("Bulk generate error:", err);
      setError(`Generation failed: ${err.message}`);
    }
    setBulkGenerating(false);
  };
  // ═══════════════════════════════════════════════════════════════
  // SINGLE CRUD
  // ═══════════════════════════════════════════════════════════════
  const handleCreate = async () => {
    if (!formQrCode || !formBatchId) {
      setError("QR code and batch are required");
      return;
    }
    setError("");
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("qr_code", formQrCode)
      .limit(1);
    if (existing && existing.length > 0) {
      setError("QR code already exists");
      return;
    }
    const { error: insertErr } = await supabase.from("products").insert({
      qr_code: formQrCode,
      batch_id: formBatchId,
      qr_type: formType,
      points_value: formType === "product" ? 10 : formPoints,
      stockist_id: formStockist || null,
      status: formStockist ? "distributed" : "in_stock",
      distributed_at: formStockist ? new Date().toISOString() : null,
      expires_at: formExpiry || null,
      is_active: formActive,
      claimed: false,
    });
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setShowCreateModal(false);
    resetForm();
    fetchProducts();
    computeAnalytics();
  };
  const handleEdit = async () => {
    if (!showEditModal) return;
    setError("");
    const updates = {
      qr_type: formType,
      points_value: formType === "product" ? 10 : formPoints,
      stockist_id: formStockist || null,
      expires_at: formExpiry || null,
      is_active: formActive,
    };
    if (formStockist && showEditModal.status === "in_stock") {
      updates.status = "distributed";
      updates.distributed_at = new Date().toISOString();
    }
    const { error: updateErr } = await supabase
      .from("products")
      .update(updates)
      .eq("id", showEditModal.id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setShowEditModal(null);
    resetForm();
    fetchProducts();
    computeAnalytics();
  };
  const handleDelete = async (id) => {
    const { error: deleteErr } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    if (deleteErr) {
      setError(deleteErr.message);
      return;
    }
    setShowDeleteConfirm(null);
    fetchProducts();
    computeAnalytics();
  };
  const handleRevoke = async (product) => {
    const { error: updateErr } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", product.id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    fetchProducts();
  };
  const handleStatusChange = async (product, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === "distributed")
      updates.distributed_at = new Date().toISOString();
    if (newStatus === "claimed") updates.claimed_at = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("products")
      .update(updates)
      .eq("id", product.id);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    fetchProducts();
    computeAnalytics();
  };
  const resetForm = () => {
    setFormQrCode("");
    setFormBatchId("");
    setFormType("product");
    setFormPoints(10);
    setFormStockist("");
    setFormExpiry("");
    setFormActive(true);
  };
  const openEditModal = (product) => {
    setFormType(product.qr_type || "product");
    setFormPoints(product.points_value || 10);
    setFormStockist(product.stockist_id || "");
    setFormExpiry(product.expires_at ? product.expires_at.split("T")[0] : "");
    setFormActive(product.is_active !== false);
    setShowEditModal(product);
  };
  // ═══════════════════════════════════════════════════════════════
  // CSV EXPORT
  // ═══════════════════════════════════════════════════════════════
  const exportCSV = () => {
    const headers = [
      "QR Code",
      "Batch",
      "Type",
      "Points",
      "Status",
      "Active",
      "Stockist",
      "Created",
      "Distributed",
      "Claimed",
      "Expires",
    ];
    const rows = products.map((p) => [
      p.qr_code,
      p.batches?.batch_number || "",
      p.qr_type || "product",
      p.points_value || 10,
      p.status || "in_stock",
      p.is_active !== false ? "Yes" : "No",
      stockists.find((s) => s.id === p.stockist_id)?.business_name || "",
      fmtDate(p.created_at),
      fmtDate(p.distributed_at),
      fmtDate(p.claimed_at),
      fmtDate(p.expires_at),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `protea-qr-codes-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  // ═══════════════════════════════════════════════════════════════
  // PRINT-READY QR IMAGES
  // ═══════════════════════════════════════════════════════════════
  const downloadQRImage = (qrCode) => {
    const container = qrContainerRef.current;
    if (!container) return;
    const targetId = `qr-render-${safeId(qrCode)}`;
    const tempDiv = container.querySelector(`#${targetId}`);
    if (!tempDiv) {
      console.warn("QR render div not found for", qrCode);
      return;
    }
    const svgElem = tempDiv.querySelector("svg");
    if (!svgElem) {
      console.warn("SVG not found in QR render div for", qrCode);
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgElem);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const qrSize = 400;
      const padding = 40;
      const totalSize = qrSize + padding * 2 + 80;
      canvas.width = totalSize;
      canvas.height = totalSize;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalSize, totalSize);
      ctx.fillStyle = C.green;
      ctx.fillRect(0, 0, totalSize, 50);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Jost, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PROTEA BOTANICALS", totalSize / 2, 33);
      ctx.drawImage(img, padding, 60, qrSize, qrSize);
      ctx.fillStyle = C.green;
      ctx.font = "bold 14px Jost, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(qrCode, totalSize / 2, qrSize + 60 + 30);
      ctx.fillStyle = C.muted;
      ctx.font = "10px Jost, sans-serif";
      ctx.fillText(
        "Scan to verify authenticity",
        totalSize / 2,
        qrSize + 60 + 50,
      );
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${qrCode}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };
  // ═══════════════════════════════════════════════════════════════
  // RENDER: MAIN DASHBOARD
  // v3.4: No password gate — RequireRole in App.js handles auth
  // v3.4: No internal header — NavBar in App.js handles navigation
  // ═══════════════════════════════════════════════════════════════
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* ─── Dashboard Header (branded, no logout — NavBar handles that) ─── */}
      <div
        style={{
          background: C.green,
          padding: "20px 32px",
          borderRadius: "2px",
          marginBottom: "24px",
        }}
      >
        <span
          style={{
            color: C.accent,
            fontSize: "11px",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          Protea Botanicals
        </span>
        <h1
          style={{
            color: C.white,
            fontFamily: FONTS.heading,
            fontSize: "24px",
            margin: "4px 0 0",
          }}
        >
          Admin Dashboard
        </h1>
      </div>
      {/* ─── Tab Navigation — ★ v3.5: Smart QR | ★ v3.6: Analytics ─── */}
      <div
        style={{
          background: C.white,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          gap: "0",
          overflowX: "auto",
          marginBottom: "24px",
          borderRadius: "2px",
        }}
      >
        <TabBtn
          active={tab === "overview"}
          label="Overview"
          onClick={() => setTab("overview")}
        />
        <TabBtn
          active={tab === "qr_codes"}
          label="QR Codes"
          onClick={() => setTab("qr_codes")}
        />
        <TabBtn
          active={tab === "generator"}
          label="QR Generator"
          onClick={() => setTab("generator")}
        />
        {/* ★ v3.5: Smart QR tab for campaign/marketing QR codes */}
        <TabBtn
          active={tab === "smart_qr"}
          label="Smart QR"
          onClick={() => setTab("smart_qr")}
        />
        <TabBtn
          active={tab === "users"}
          label="Users"
          onClick={() => setTab("users")}
        />
        {/* ★ v3.6: Analytics tab for scan source tracking */}
        <TabBtn
          active={tab === "analytics"}
          label="Analytics"
          onClick={() => setTab("analytics")}
        />
      </div>
      {/* ─── Content ─── */}
      <div>
        {error && (
          <div
            style={{
              background: C.lightRed,
              border: `1px solid ${C.red}`,
              padding: "12px 16px",
              borderRadius: "2px",
              marginBottom: "20px",
              color: C.red,
              fontSize: "13px",
            }}
          >
            ⚠️ {error}
            <button
              onClick={() => setError("")}
              style={{
                float: "right",
                background: "none",
                border: "none",
                color: C.red,
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              ×
            </button>
          </div>
        )}
        {/* ══════ OVERVIEW TAB ══════ */}
        {tab === "overview" && (
          <div>
            <h2
              style={{
                fontFamily: FONTS.heading,
                color: C.green,
                fontSize: "22px",
                marginBottom: "24px",
              }}
            >
              System Overview
            </h2>
            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
                marginBottom: "32px",
              }}
            >
              <StatCard
                icon="📦"
                label="Total QR Codes"
                value={analytics.total}
                color={C.green}
              />
              <StatCard
                icon="✅"
                label="Claimed"
                value={analytics.claimed}
                sub={`${analytics.claimRate}% claim rate`}
                color={C.accent}
              />
              <StatCard
                icon="📤"
                label="Distributed"
                value={analytics.distributed}
                color={C.gold}
              />
              <StatCard
                icon="🏪"
                label="In Stock"
                value={analytics.inStock || 0}
                color={C.blue}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
                marginBottom: "32px",
              }}
            >
              <StatCard
                icon="🎯"
                label="Points Distributed"
                value={analytics.totalPointsDistributed}
                color={C.gold}
              />
              <StatCard
                icon="🏬"
                label="Active Stockists"
                value={analytics.activeStockists}
                color={C.brown}
              />
              <StatCard
                icon="⏱️"
                label="Avg Time to Claim"
                value={
                  analytics.avgTimeToClaim
                    ? `${analytics.avgTimeToClaim}h`
                    : "—"
                }
                sub="hours from distribution"
                color={C.blue}
              />
              <StatCard
                icon="👥"
                label="Total Users"
                value={analytics.userCount || 0}
                color={C.green}
              />
            </div>
            <h3
              style={{
                fontFamily: FONTS.heading,
                color: C.green,
                fontSize: "18px",
                marginBottom: "16px",
              }}
            >
              Quick Actions
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => setTab("generator")}
                style={makeBtn(C.accent, C.white)}
              >
                GENERATE QR CODES
              </button>
              <button
                onClick={() => setTab("smart_qr")}
                style={makeBtn(C.gold, C.white)}
              >
                SMART QR CAMPAIGNS
              </button>
              <button
                onClick={() => setTab("qr_codes")}
                style={makeBtn(C.blue, C.white)}
              >
                VIEW ALL CODES
              </button>
              <button onClick={exportCSV} style={makeBtn(C.gold, C.white)}>
                EXPORT CSV
              </button>
              <button
                onClick={() => {
                  computeAnalytics();
                  fetchProducts();
                }}
                style={makeBtn(C.mid, C.white)}
              >
                REFRESH DATA
              </button>
            </div>
          </div>
        )}
        {/* ══════ QR CODES TAB ══════ */}
        {tab === "qr_codes" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <h2
                style={{
                  fontFamily: FONTS.heading,
                  color: C.green,
                  fontSize: "22px",
                  margin: 0,
                }}
              >
                QR Code Management
              </h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  style={makeBtn(C.accent)}
                >
                  + NEW CODE
                </button>
                <button
                  onClick={() => setTab("generator")}
                  style={makeBtn(C.green)}
                >
                  BULK GENERATE
                </button>
                <button onClick={exportCSV} style={makeBtn(C.gold)}>
                  EXPORT CSV
                </button>
              </div>
            </div>
            {/* ─── Filters ─── */}
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: "2px",
                padding: "16px",
                marginBottom: "20px",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                alignItems: "flex-end",
              }}
            >
              <div style={{ flex: "2 1 200px" }}>
                <label style={labelStyle}>Search QR Code</label>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="PB-001-2026..."
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label style={labelStyle}>Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label style={labelStyle}>Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Types</option>
                  {QR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 160px" }}>
                <label style={labelStyle}>Batch</label>
                <select
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "1 1 160px" }}>
                <label style={labelStyle}>Stockist</label>
                <select
                  value={filterStockist}
                  onChange={(e) => setFilterStockist(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Stockists</option>
                  {stockists.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.business_name || s.contact_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{ fontSize: "13px", color: C.muted, marginBottom: "12px" }}
            >
              Showing {products.length} of {totalCount} codes{" "}
              {filterStatus !== "all" ||
              filterType !== "all" ||
              filterBatch !== "all" ||
              searchTerm
                ? "(filtered)"
                : ""}
            </div>
            {/* ─── Table ─── */}
            {loading ? (
              <div
                style={{ textAlign: "center", padding: "40px", color: C.muted }}
              >
                Loading...
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr style={{ background: C.green, color: C.white }}>
                      {[
                        "QR Code",
                        "Batch",
                        "Type",
                        "Pts",
                        "Status",
                        "Active",
                        "Stockist",
                        "Created",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            fontSize: "10px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          style={{
                            padding: "40px",
                            textAlign: "center",
                            color: C.muted,
                          }}
                        >
                          No QR codes found. Create some codes to get started.
                        </td>
                      </tr>
                    ) : (
                      products.map((p, i) => (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: `1px solid ${C.border}`,
                            background: i % 2 === 0 ? C.white : C.cream,
                            opacity: p.is_active === false ? 0.5 : 1,
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              fontWeight: 600,
                              fontFamily: "monospace",
                              fontSize: "12px",
                            }}
                          >
                            {p.qr_code}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {p.batches?.batch_number || "—"}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <TypeBadge type={p.qr_type || "product"} />
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                            {p.points_value || 10}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <StatusBadge status={p.status || "in_stock"} />
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            {p.is_active === false ? (
                              <span style={{ color: C.red, fontWeight: 600 }}>
                                REVOKED
                              </span>
                            ) : (
                              <span style={{ color: C.accent }}>✓</span>
                            )}
                          </td>
                          <td
                            style={{ padding: "10px 12px", fontSize: "12px" }}
                          >
                            {stockists.find((s) => s.id === p.stockist_id)
                              ?.business_name || "—"}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "12px",
                              color: C.muted,
                            }}
                          >
                            {fmtDate(p.created_at)}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                onClick={() => openEditModal(p)}
                                style={{
                                  ...makeBtn(C.blue),
                                  padding: "4px 8px",
                                  fontSize: "9px",
                                }}
                              >
                                EDIT
                              </button>
                              <button
                                onClick={() => downloadQRImage(p.qr_code)}
                                style={{
                                  ...makeBtn(C.gold),
                                  padding: "4px 8px",
                                  fontSize: "9px",
                                }}
                              >
                                QR
                              </button>
                              {p.is_active !== false &&
                                p.status !== "claimed" && (
                                  <button
                                    onClick={() => handleRevoke(p)}
                                    style={{
                                      ...makeBtn(C.orange),
                                      padding: "4px 8px",
                                      fontSize: "9px",
                                    }}
                                  >
                                    REVOKE
                                  </button>
                                )}
                              {p.status === "in_stock" && (
                                <button
                                  onClick={() =>
                                    handleStatusChange(p, "distributed")
                                  }
                                  style={{
                                    ...makeBtn(C.accent),
                                    padding: "4px 8px",
                                    fontSize: "9px",
                                  }}
                                >
                                  DIST
                                </button>
                              )}
                              <button
                                onClick={() => setShowDeleteConfirm(p)}
                                style={{
                                  ...makeBtn(C.red),
                                  padding: "4px 8px",
                                  fontSize: "9px",
                                }}
                              >
                                DEL
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "20px",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{
                    ...makeBtn(C.mid),
                    opacity: page === 0 ? 0.4 : 1,
                    padding: "6px 14px",
                    fontSize: "10px",
                  }}
                >
                  ← PREV
                </button>
                <span style={{ fontSize: "13px", color: C.muted }}>
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  style={{
                    ...makeBtn(C.mid),
                    opacity: page >= totalPages - 1 ? 0.4 : 1,
                    padding: "6px 14px",
                    fontSize: "10px",
                  }}
                >
                  NEXT →
                </button>
              </div>
            )}
          </div>
        )}
        {/* ══════ QR GENERATOR TAB ══════ */}
        {tab === "generator" && (
          <div>
            <h2
              style={{
                fontFamily: FONTS.heading,
                color: C.green,
                fontSize: "22px",
                marginBottom: "24px",
              }}
            >
              Bulk QR Code Generator
            </h2>
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              {/* Generator Form */}
              <div
                style={{
                  flex: "1 1 400px",
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: "2px",
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: C.green,
                    fontFamily: FONTS.body,
                    borderBottom: `2px solid ${C.accent}`,
                    paddingBottom: "8px",
                    marginBottom: "20px",
                  }}
                >
                  Generation Settings
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Batch *</label>
                  <select
                    value={bulkBatch}
                    onChange={(e) => setBulkBatch(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Select batch...</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batch_number} —{" "}
                        {b.product_name || b.strain || "Unknown"}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Number of Codes *</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={bulkCount}
                    onChange={(e) =>
                      setBulkCount(
                        Math.min(
                          500,
                          Math.max(1, parseInt(e.target.value) || 1),
                        ),
                      )
                    }
                    style={inputStyle}
                  />
                  <div
                    style={{
                      fontSize: "11px",
                      color: C.muted,
                      marginTop: "4px",
                    }}
                  >
                    Max 500 per batch. Codes auto-numbered sequentially.
                  </div>
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>QR Type</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {QR_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setBulkType(t)}
                        style={{
                          ...makeBtn(
                            bulkType === t ? QR_TYPE_COLORS[t] : "transparent",
                            bulkType === t ? C.white : C.muted,
                          ),
                          border: `1px solid ${bulkType === t ? QR_TYPE_COLORS[t] : C.border}`,
                          flex: 1,
                          padding: "8px",
                        }}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {bulkType !== "product" && (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={labelStyle}>Points Value</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={bulkPoints}
                      onChange={(e) =>
                        setBulkPoints(parseInt(e.target.value) || 10)
                      }
                      style={inputStyle}
                    />
                    <div
                      style={{
                        fontSize: "11px",
                        color: C.muted,
                        marginTop: "4px",
                      }}
                    >
                      Custom points for promo/voucher codes. Product codes
                      always award 10.
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>
                    Assign to Stockist (optional)
                  </label>
                  <select
                    value={bulkStockist}
                    onChange={(e) => setBulkStockist(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">No stockist — In Stock</option>
                    {stockists.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.business_name || s.contact_name}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      fontSize: "11px",
                      color: C.muted,
                      marginTop: "4px",
                    }}
                  >
                    Assigning a stockist auto-sets status to "Distributed".
                  </div>
                </div>
                {(bulkType === "promo" || bulkType === "voucher") && (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={labelStyle}>Expiry Date (optional)</label>
                    <input
                      type="date"
                      value={bulkExpiry}
                      onChange={(e) => setBulkExpiry(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                )}
                <button
                  onClick={handleBulkGenerate}
                  disabled={bulkGenerating || !bulkBatch}
                  style={{
                    ...makeBtn(C.accent),
                    width: "100%",
                    padding: "14px",
                    fontSize: "13px",
                    opacity: bulkGenerating || !bulkBatch ? 0.6 : 1,
                  }}
                >
                  {bulkGenerating
                    ? "GENERATING..."
                    : `GENERATE ${bulkCount} QR CODES`}
                </button>
              </div>
              {/* Result / Preview Panel */}
              <div style={{ flex: "1 1 300px" }}>
                {bulkResult ? (
                  <div
                    style={{
                      background: C.lightGreen,
                      border: `1px solid ${C.accent}`,
                      borderRadius: "2px",
                      padding: "24px",
                    }}
                  >
                    <h3
                      style={{
                        color: C.green,
                        fontFamily: FONTS.heading,
                        marginTop: 0,
                      }}
                    >
                      ✅ Generation Complete
                    </h3>
                    <p style={{ fontSize: "14px", margin: "8px 0" }}>
                      <strong>{bulkResult.count}</strong> QR codes generated for
                      batch <strong>{bulkResult.batchNumber}</strong>
                    </p>
                    <p
                      style={{
                        fontSize: "13px",
                        color: C.muted,
                        fontFamily: "monospace",
                      }}
                    >
                      {bulkResult.firstCode} → {bulkResult.lastCode}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginTop: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => {
                          setTab("qr_codes");
                          setFilterBatch(bulkBatch);
                        }}
                        style={makeBtn(C.green)}
                      >
                        VIEW CODES
                      </button>
                      <button onClick={exportCSV} style={makeBtn(C.gold)}>
                        EXPORT CSV
                      </button>
                      <button
                        onClick={() => setBulkResult(null)}
                        style={makeBtn(C.mid)}
                      >
                        GENERATE MORE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: "2px",
                      padding: "24px",
                    }}
                  >
                    <h3
                      style={{
                        color: C.green,
                        fontFamily: FONTS.heading,
                        marginTop: 0,
                      }}
                    >
                      How It Works
                    </h3>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#555",
                        lineHeight: 1.7,
                      }}
                    >
                      <p>
                        <strong>1.</strong> Select a batch (e.g. PB-002-2026)
                      </p>
                      <p>
                        <strong>2.</strong> Choose how many codes to generate
                      </p>
                      <p>
                        <strong>3.</strong> Set type: Product (standard 10pts),
                        Promo (custom points), or Voucher (redeemable)
                      </p>
                      <p>
                        <strong>4.</strong> Optionally assign to a stockist for
                        distribution tracking
                      </p>
                      <p>
                        <strong>5.</strong> Codes are auto-numbered sequentially
                        (e.g. PB-002-2026-0001 through -0050)
                      </p>
                      <p
                        style={{
                          marginTop: "16px",
                          color: C.muted,
                          fontSize: "12px",
                        }}
                      >
                        Each code links to <code>{SITE_URL}/scan/[code]</code>{" "}
                        for customer scanning.
                      </p>
                    </div>
                    <div
                      style={{
                        marginTop: "20px",
                        borderTop: `1px solid ${C.border}`,
                        paddingTop: "16px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: C.green,
                          marginBottom: "8px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        QR Type Guide
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          fontSize: "12px",
                        }}
                      >
                        <div>
                          <TypeBadge type="product" />{" "}
                          <span style={{ marginLeft: "8px" }}>
                            Standard loyalty scan — always 10 points
                          </span>
                        </div>
                        <div>
                          <TypeBadge type="promo" />{" "}
                          <span style={{ marginLeft: "8px" }}>
                            Promotional — custom points (events, campaigns)
                          </span>
                        </div>
                        <div>
                          <TypeBadge type="voucher" />{" "}
                          <span style={{ marginLeft: "8px" }}>
                            Redeemable discount — tied to redemptions table
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ══════ ★ v3.5: SMART QR TAB ══════ */}
        {tab === "smart_qr" && (
          <div>
            <AdminQrGenerator />
          </div>
        )}
        {/* ══════ USERS TAB ══════ */}
        {tab === "users" && (
          <div>
            <h2
              style={{
                fontFamily: FONTS.heading,
                color: C.green,
                fontSize: "22px",
                marginBottom: "20px",
              }}
            >
              User Management
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ background: C.green, color: C.white }}>
                    {["Email / ID", "Role", "Points", "Tier", "Joined"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            fontSize: "10px",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontWeight: 600,
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "40px",
                          textAlign: "center",
                          color: C.muted,
                        }}
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          background: i % 2 === 0 ? C.white : C.cream,
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 12px",
                            fontFamily: "monospace",
                            fontSize: "11px",
                          }}
                        >
                          {u.email || u.id?.substring(0, 12) + "..."}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span
                            style={{
                              background:
                                u.role === "admin"
                                  ? C.gold
                                  : u.role === "retailer"
                                    ? C.brown
                                    : C.blue,
                              color: C.white,
                              padding: "2px 8px",
                              borderRadius: "2px",
                              fontSize: "10px",
                              fontWeight: 600,
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                            }}
                          >
                            {u.role || "customer"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                          {u.loyalty_points || 0}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            textTransform: "capitalize",
                          }}
                        >
                          {u.loyalty_tier || "bronze"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            fontSize: "12px",
                            color: C.muted,
                          }}
                        >
                          {fmtDate(u.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* ══════ ★ v3.6: ANALYTICS TAB ══════ */}
        {tab === "analytics" && (
          <div>
            <AdminAnalytics />
          </div>
        )}
      </div>
      {/* ═══════════════════════════════════════════════════════════════
          HIDDEN QR RENDER CONTAINER (outside table for performance)
          ═══════════════════════════════════════════════════════════════ */}
      <div
        ref={qrContainerRef}
        style={{
          position: "absolute",
          left: "-9999px",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        {products.map((p) => (
          <div key={p.qr_code} id={`qr-render-${safeId(p.qr_code)}`}>
            <QRCodeSVG
              value={`${SITE_URL}/scan/${p.qr_code}`}
              size={300}
              level="H"
            />
          </div>
        ))}
      </div>
      {/* ═══════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════ */}
      {/* ─── Create Modal ─── */}
      {showCreateModal && (
        <ModalOverlay onClose={() => setShowCreateModal(false)}>
          <h3
            style={{ fontFamily: FONTS.heading, color: C.green, marginTop: 0 }}
          >
            Create QR Code
          </h3>
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>QR Code *</label>
            <input
              value={formQrCode}
              onChange={(e) => setFormQrCode(e.target.value)}
              placeholder="PB-001-2026-0006"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Batch *</label>
            <select
              value={formBatchId}
              onChange={(e) => setFormBatchId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select...</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_number}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              style={inputStyle}
            >
              {QR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {formType !== "product" && (
            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>Points Value</label>
              <input
                type="number"
                min={1}
                value={formPoints}
                onChange={(e) => setFormPoints(parseInt(e.target.value) || 10)}
                style={inputStyle}
              />
            </div>
          )}
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Stockist</label>
            <select
              value={formStockist}
              onChange={(e) => setFormStockist(e.target.value)}
              style={inputStyle}
            >
              <option value="">None</option>
              {stockists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.business_name || s.contact_name}
                </option>
              ))}
            </select>
          </div>
          {(formType === "promo" || formType === "voucher") && (
            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>Expiry Date</label>
              <input
                type="date"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}
          {error && <p style={{ color: C.red, fontSize: "12px" }}>{error}</p>}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button
              onClick={handleCreate}
              style={{ ...makeBtn(C.accent), flex: 1 }}
            >
              CREATE
            </button>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setError("");
              }}
              style={{ ...makeBtn(C.muted), flex: 1 }}
            >
              CANCEL
            </button>
          </div>
        </ModalOverlay>
      )}
      {/* ─── Edit Modal ─── */}
      {showEditModal && (
        <ModalOverlay onClose={() => setShowEditModal(null)}>
          <h3
            style={{ fontFamily: FONTS.heading, color: C.green, marginTop: 0 }}
          >
            Edit: {showEditModal.qr_code}
          </h3>
          <div
            style={{ marginBottom: "8px", fontSize: "12px", color: C.muted }}
          >
            Status: <StatusBadge status={showEditModal.status || "in_stock"} />{" "}
            &nbsp; Claimed: {showEditModal.claimed ? "Yes" : "No"}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              style={inputStyle}
            >
              {QR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          {formType !== "product" && (
            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>Points Value</label>
              <input
                type="number"
                min={1}
                value={formPoints}
                onChange={(e) => setFormPoints(parseInt(e.target.value) || 10)}
                style={inputStyle}
              />
            </div>
          )}
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Stockist</label>
            <select
              value={formStockist}
              onChange={(e) => setFormStockist(e.target.value)}
              style={inputStyle}
            >
              <option value="">None</option>
              {stockists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.business_name || s.contact_name}
                </option>
              ))}
            </select>
          </div>
          {(formType === "promo" || formType === "voucher") && (
            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>Expiry Date</label>
              <input
                type="date"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                ...labelStyle,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textTransform: "none",
                letterSpacing: "normal",
                fontSize: "13px",
              }}
            >
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
              />
              Active (uncheck to revoke)
            </label>
          </div>
          {error && <p style={{ color: C.red, fontSize: "12px" }}>{error}</p>}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button
              onClick={handleEdit}
              style={{ ...makeBtn(C.accent), flex: 1 }}
            >
              SAVE CHANGES
            </button>
            <button
              onClick={() => {
                setShowEditModal(null);
                setError("");
              }}
              style={{ ...makeBtn(C.muted), flex: 1 }}
            >
              CANCEL
            </button>
          </div>
        </ModalOverlay>
      )}
      {/* ─── Delete Confirmation ─── */}
      {showDeleteConfirm && (
        <ModalOverlay onClose={() => setShowDeleteConfirm(null)}>
          <h3 style={{ fontFamily: FONTS.heading, color: C.red, marginTop: 0 }}>
            Delete QR Code
          </h3>
          <p style={{ fontSize: "14px" }}>
            Are you sure you want to permanently delete{" "}
            <strong>{showDeleteConfirm.qr_code}</strong>?
          </p>
          <p style={{ fontSize: "12px", color: C.muted }}>
            This action cannot be undone. If the code has been printed, consider
            revoking instead.
          </p>
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button
              onClick={() => handleDelete(showDeleteConfirm.id)}
              style={{ ...makeBtn(C.red), flex: 1 }}
            >
              DELETE PERMANENTLY
            </button>
            <button
              onClick={() => setShowDeleteConfirm(null)}
              style={{ ...makeBtn(C.muted), flex: 1 }}
            >
              CANCEL
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════
// MODAL OVERLAY COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function ModalOverlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: "2px",
          padding: "28px",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "80vh",
          overflowY: "auto",
          border: `1px solid ${C.border}`,
          fontFamily: FONTS.body,
        }}
      >
        {children}
      </div>
    </div>
  );
}
