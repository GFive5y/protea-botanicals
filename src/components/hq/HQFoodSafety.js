// src/components/hq/HQFoodSafety.js
// WP-FNB S4 — Food Safety Compliance Vault — v1.0
// Built: March 25, 2026
// Rules: RULE 0F (tenant_id), RULE 0G (useTenant inside),
//        WorkflowGuide first, InfoTooltip on key fields

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../services/supabaseClient";
import { useTenant } from "../../services/tenantService";
import WorkflowGuide from "../WorkflowGuide";
import InfoTooltip from "../InfoTooltip";

const C = {
  bg: "#F8F7F4",
  surface: "#FFFFFF",
  border: "#E8E4DC",
  ink: "#1A1A18",
  inkMid: "#4A4740",
  inkLight: "#8A8680",
  accent: "#2D6A4F",
  accentBg: "#EBF5EF",
  amber: "#92400E",
  amberBg: "#FEF3C7",
  red: "#991B1B",
  redBg: "#FEF2F2",
  blue: "#1D4ED8",
  blueBg: "#EFF6FF",
  purple: "#5B21B6",
  purpleBg: "#F5F3FF",
};

const DOC_TYPES = [
  {
    key: "fsca_certificate",
    label: "FSCA Certificate",
    icon: "🏛️",
    color: C.red,
  },
  {
    key: "haccp_certification",
    label: "HACCP Certification",
    icon: "🛡️",
    color: C.accent,
  },
  {
    key: "supplier_audit",
    label: "Supplier Audit Report",
    icon: "🔍",
    color: C.blue,
  },
  {
    key: "allergen_test",
    label: "Allergen Test Result",
    icon: "⚠️",
    color: C.amber,
  },
  {
    key: "microbiological",
    label: "Microbiological Test",
    icon: "🦠",
    color: C.red,
  },
  {
    key: "pesticide_screen",
    label: "Pesticide Screen",
    icon: "🌿",
    color: C.accent,
  },
  {
    key: "heavy_metal",
    label: "Heavy Metal Analysis",
    icon: "⚗️",
    color: C.purple,
  },
  {
    key: "shelf_life_study",
    label: "Shelf Life Study",
    icon: "📅",
    color: C.blue,
  },
  {
    key: "nutritional_analysis",
    label: "Nutritional Analysis",
    icon: "📊",
    color: C.accent,
  },
  {
    key: "label_approval",
    label: "Label Approval",
    icon: "🏷️",
    color: C.inkMid,
  },
  {
    key: "water_quality",
    label: "Water Quality Certificate",
    icon: "💧",
    color: C.blue,
  },
  {
    key: "pest_control",
    label: "Pest Control Report",
    icon: "🐛",
    color: C.amber,
  },
  {
    key: "cleaning_verification",
    label: "Cleaning Verification",
    icon: "🧹",
    color: C.accent,
  },
  {
    key: "temp_calibration",
    label: "Temperature Calibration",
    icon: "🌡️",
    color: C.blue,
  },
  {
    key: "other",
    label: "Other Food Safety Document",
    icon: "📄",
    color: C.inkLight,
  },
];

function getDocType(key) {
  return (
    DOC_TYPES.find((d) => d.key === key) || DOC_TYPES[DOC_TYPES.length - 1]
  );
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function expiryColor(days) {
  if (days === null) return { color: C.inkLight, bg: C.bg, label: "No expiry" };
  if (days < 0) return { color: C.red, bg: C.redBg, label: "EXPIRED" };
  if (days <= 7) return { color: C.red, bg: C.redBg, label: `${days}d left` };
  if (days <= 30)
    return { color: C.amber, bg: C.amberBg, label: `${days}d left` };
  return { color: C.accent, bg: C.accentBg, label: `${days}d left` };
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ═════════════════════════════════════════════════════════════════════════════
export default function HQFoodSafety() {
  const { tenantId } = useTenant(); // RULE 0G

  const [activeTab, setActiveTab] = useState("vault");
  const [docs, setDocs] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterExpiry, setFilterExpiry] = useState("");
  const [searchQ, setSearchQ] = useState("");

  const emptyForm = {
    food_doc_type: "fsca_certificate",
    document_name: "",
    issuing_authority: "",
    certificate_number: "",
    cert_expiry_date: "",
    accreditation_body: "",
    scope_of_cert: "",
    linked_ingredient_ids: [],
    linked_batch_lots: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchAll = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [docRes, ingRes] = await Promise.all([
        supabase
          .from("document_log")
          .select("*")
          .eq("tenant_id", tenantId) // RULE 0F
          .eq("is_food_safety_doc", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("food_ingredients")
          .select("id, name, category")
          .or(`is_seeded.eq.true,tenant_id.eq.${tenantId}`)
          .order("name")
          .limit(200),
      ]);
      if (docRes.error) throw docRes.error;
      if (ingRes.error) throw ingRes.error;
      setDocs(docRes.data || []);
      setIngredients(ingRes.data || []);

      // ── Write cert expiry alerts to system_alerts (PlatformBar integration) ──
      const allDocs = docRes.data || [];
      const expiredDocs = allDocs.filter(
        (d) =>
          daysUntil(d.cert_expiry_date) !== null &&
          daysUntil(d.cert_expiry_date) < 0,
      );
      const expiring7 = allDocs.filter((d) => {
        const x = daysUntil(d.cert_expiry_date);
        return x !== null && x >= 0 && x <= 7;
      });
      const expiring30 = allDocs.filter((d) => {
        const x = daysUntil(d.cert_expiry_date);
        return x !== null && x > 7 && x <= 30;
      });

      // Delete stale food safety cert alerts first
      await supabase
        .from("system_alerts")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("alert_type", "food_cert_expiry");

      // Re-insert fresh alerts
      const alertsToInsert = [
        ...expiredDocs.map((d) => ({
          tenant_id: tenantId,
          alert_type: "food_cert_expiry",
          severity: "critical",
          message: `EXPIRED: ${d.document_name} — expired ${fmtDate(d.cert_expiry_date)}. Renew immediately.`,
          created_at: new Date().toISOString(),
        })),
        ...expiring7.map((d) => ({
          tenant_id: tenantId,
          alert_type: "food_cert_expiry",
          severity: "warning",
          message: `Expiring in ${daysUntil(d.cert_expiry_date)} days: ${d.document_name} — expires ${fmtDate(d.cert_expiry_date)}.`,
          created_at: new Date().toISOString(),
        })),
        ...expiring30.map((d) => ({
          tenant_id: tenantId,
          alert_type: "food_cert_expiry",
          severity: "info",
          message: `Expiring in ${daysUntil(d.cert_expiry_date)} days: ${d.document_name} — expires ${fmtDate(d.cert_expiry_date)}.`,
          created_at: new Date().toISOString(),
        })),
      ];
      if (alertsToInsert.length > 0) {
        await supabase.from("system_alerts").insert(alertsToInsert);
      }
    } catch (err) {
      showToast("Load failed: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleSave() {
    if (!form.document_name?.trim()) {
      showToast("Document name required", "error");
      return;
    }
    if (!form.food_doc_type) {
      showToast("Document type required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId, // RULE 0F
        is_food_safety_doc: true,
        document_name: form.document_name,
        food_doc_type: form.food_doc_type,
        issuing_authority: form.issuing_authority || null,
        certificate_number: form.certificate_number || null,
        cert_expiry_date: form.cert_expiry_date || null,
        accreditation_body: form.accreditation_body || null,
        scope_of_cert: form.scope_of_cert || null,
        linked_ingredient_ids: form.linked_ingredient_ids || [],
        linked_batch_lots: form.linked_batch_lots
          ? form.linked_batch_lots
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        notes: form.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("document_log").insert(payload);
      if (error) throw error;
      showToast("✅ Document added to compliance vault");
      setShowForm(false);
      setForm(emptyForm);
      fetchAll();
    } catch (err) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const kpis = useMemo(() => {
    const total = docs.length;
    const expired = docs.filter(
      (d) =>
        daysUntil(d.cert_expiry_date) !== null &&
        daysUntil(d.cert_expiry_date) < 0,
    ).length;
    const expiring7 = docs.filter((d) => {
      const x = daysUntil(d.cert_expiry_date);
      return x !== null && x >= 0 && x <= 7;
    }).length;
    const expiring30 = docs.filter((d) => {
      const x = daysUntil(d.cert_expiry_date);
      return x !== null && x >= 0 && x <= 30;
    }).length;
    const noExpiry = docs.filter((d) => !d.cert_expiry_date).length;
    return { total, expired, expiring7, expiring30, noExpiry };
  }, [docs]);

  const filtered = useMemo(() => {
    let list = docs;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (d) =>
          (d.document_name || "").toLowerCase().includes(q) ||
          (d.certificate_number || "").toLowerCase().includes(q) ||
          (d.issuing_authority || "").toLowerCase().includes(q),
      );
    }
    if (filterType) list = list.filter((d) => d.food_doc_type === filterType);
    if (filterExpiry === "expired")
      list = list.filter(
        (d) =>
          daysUntil(d.cert_expiry_date) !== null &&
          daysUntil(d.cert_expiry_date) < 0,
      );
    if (filterExpiry === "expiring7")
      list = list.filter((d) => {
        const x = daysUntil(d.cert_expiry_date);
        return x !== null && x >= 0 && x <= 7;
      });
    if (filterExpiry === "expiring30")
      list = list.filter((d) => {
        const x = daysUntil(d.cert_expiry_date);
        return x !== null && x >= 0 && x <= 30;
      });
    return list;
  }, [docs, searchQ, filterType, filterExpiry]);

  const sInput = {
    width: "100%",
    padding: "8px 11px",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "inherit",
    background: C.surface,
    boxSizing: "border-box",
    color: C.ink,
  };
  const sLabel = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: C.inkLight,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };

  const TABS = [
    { id: "vault", label: `Compliance Vault (${docs.length})` },
    { id: "add", label: "+ Add Document" },
    {
      id: "expiry",
      label: `Expiry Tracker${kpis.expired > 0 ? ` 🔴 ${kpis.expired}` : kpis.expiring7 > 0 ? ` ⚠️ ${kpis.expiring7}` : ""}`,
    },
    { id: "register", label: "Document Register" },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: C.ink }}>
      <WorkflowGuide tabId="hq-food-safety" />

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "error" ? C.redBg : "#F0FDF4",
            border: `1px solid ${toast.type === "error" ? "#FECACA" : "#BBF7D0"}`,
            color: toast.type === "error" ? C.red : "#166534",
            padding: "12px 20px",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
            maxWidth: 420,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            margin: 0,
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "-0.02em",
          }}
        >
          📋 Food Safety Compliance Vault
          <InfoTooltip
            title="Compliance Vault"
            body="Central repository for all food safety certificates, test results, and regulatory documents. Expiry alerts fire 30 days before any certificate expires. Documents link to ingredients and batch lot numbers for full traceability."
          />
        </h2>
        <p style={{ margin: "4px 0 0", color: C.inkLight, fontSize: 14 }}>
          {kpis.total} documents ·{" "}
          {kpis.expired > 0 ? `${kpis.expired} expired · ` : ""}
          {kpis.expiring30} expiring within 30 days
        </p>
      </div>

      {/* KPI strip */}
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}
      >
        {[
          {
            label: "Total Documents",
            value: kpis.total,
            accent: C.accent,
            bg: C.accentBg,
          },
          {
            label: "Expired",
            value: kpis.expired,
            accent: kpis.expired > 0 ? C.red : C.accent,
            bg: kpis.expired > 0 ? C.redBg : C.accentBg,
          },
          {
            label: "Expiring ≤7 Days",
            value: kpis.expiring7,
            accent: kpis.expiring7 > 0 ? C.red : C.accent,
            bg: kpis.expiring7 > 0 ? C.redBg : C.accentBg,
          },
          {
            label: "Expiring ≤30 Days",
            value: kpis.expiring30,
            accent: kpis.expiring30 > 0 ? C.amber : C.accent,
            bg: kpis.expiring30 > 0 ? C.amberBg : C.accentBg,
          },
          {
            label: "No Expiry Set",
            value: kpis.noExpiry,
            accent: C.inkMid,
            bg: C.bg,
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              background: k.bg,
              border: `1px solid ${k.accent}20`,
              borderRadius: 10,
              padding: "16px 20px",
              flex: 1,
              minWidth: 130,
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: k.accent,
                letterSpacing: "-0.02em",
              }}
            >
              {k.value}
            </div>
            <div
              style={{
                fontSize: 12,
                color: k.accent,
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `2px solid ${C.border}`,
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "9px 18px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? C.accent : C.inkLight,
              borderBottom:
                activeTab === tab.id
                  ? `2px solid ${C.accent}`
                  : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: C.inkLight }}>
          Loading compliance vault…
        </div>
      )}

      {/* ── VAULT TAB ─────────────────────────────────────────────────────── */}
      {!loading && activeTab === "vault" && (
        <div>
          {/* Filters */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search document name, cert number, authority…"
              style={{
                flex: 2,
                minWidth: 220,
                padding: "9px 14px",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 14,
                fontFamily: "inherit",
                background: C.surface,
              }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: C.surface,
              }}
            >
              <option value="">All Types</option>
              {DOC_TYPES.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.icon} {d.label}
                </option>
              ))}
            </select>
            <select
              value={filterExpiry}
              onChange={(e) => setFilterExpiry(e.target.value)}
              style={{
                padding: "9px 12px",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "inherit",
                background: C.surface,
              }}
            >
              <option value="">All Expiry Status</option>
              <option value="expired">🔴 Expired</option>
              <option value="expiring7">⚠️ Expiring ≤7 days</option>
              <option value="expiring30">🟡 Expiring ≤30 days</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                background: C.accentBg,
                border: `1px solid ${C.accent}30`,
                borderRadius: 10,
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: C.accent,
                  marginBottom: 8,
                }}
              >
                No food safety documents yet
              </div>
              <div style={{ fontSize: 14, color: C.inkMid, marginBottom: 20 }}>
                Add FSCA certificates, test results, audit reports and all
                compliance documents here. Expiry alerts will fire
                automatically.
              </div>
              <button
                onClick={() => setActiveTab("add")}
                style={{
                  padding: "10px 24px",
                  background: C.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                + Add First Document
              </button>
            </div>
          ) : (
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {[
                      "Document",
                      "Type",
                      "Cert Number",
                      "Issuing Authority",
                      "Expiry",
                      "Linked To",
                      "Added",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "9px 12px",
                          textAlign: "left",
                          fontSize: 11,
                          color: C.inkLight,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc, idx) => {
                    const dt = getDocType(doc.food_doc_type);
                    const days = daysUntil(doc.cert_expiry_date);
                    const exp = expiryColor(days);
                    return (
                      <tr
                        key={doc.id}
                        style={{
                          borderTop: `1px solid ${C.border}`,
                          background:
                            days !== null && days < 0
                              ? "#FFF8F8"
                              : days !== null && days <= 7
                                ? "#FFFDF0"
                                : idx % 2 === 0
                                  ? C.surface
                                  : "#FCFCFB",
                        }}
                      >
                        <td style={{ padding: "11px 12px" }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                            {doc.document_name}
                          </div>
                          {doc.scope_of_cert && (
                            <div
                              style={{
                                fontSize: 11,
                                color: C.inkLight,
                                marginTop: 2,
                              }}
                            >
                              {doc.scope_of_cert.substring(0, 50)}
                              {doc.scope_of_cert.length > 50 ? "…" : ""}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "11px 12px" }}>
                          <span
                            style={{
                              background: dt.color + "15",
                              color: dt.color,
                              border: `1px solid ${dt.color}25`,
                              borderRadius: 4,
                              padding: "2px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {dt.icon} {dt.label}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 12,
                            fontFamily: "monospace",
                            color: C.inkMid,
                          }}
                        >
                          {doc.certificate_number || "—"}
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 12,
                            color: C.inkMid,
                          }}
                        >
                          <div>{doc.issuing_authority || "—"}</div>
                          {doc.accreditation_body && (
                            <div style={{ fontSize: 10, color: C.inkLight }}>
                              {doc.accreditation_body}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "11px 12px" }}>
                          {doc.cert_expiry_date ? (
                            <div>
                              <div style={{ fontSize: 12, color: C.inkMid }}>
                                {fmtDate(doc.cert_expiry_date)}
                              </div>
                              <span
                                style={{
                                  background: exp.bg,
                                  color: exp.color,
                                  border: `1px solid ${exp.color}30`,
                                  borderRadius: 4,
                                  padding: "1px 7px",
                                  fontSize: 10,
                                  fontWeight: 700,
                                }}
                              >
                                {exp.label}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: C.inkLight, fontSize: 12 }}>
                              No expiry
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 11,
                            color: C.inkLight,
                          }}
                        >
                          {doc.linked_ingredient_ids?.length > 0 && (
                            <div>
                              🧪 {doc.linked_ingredient_ids.length} ingredient
                              {doc.linked_ingredient_ids.length !== 1
                                ? "s"
                                : ""}
                            </div>
                          )}
                          {doc.linked_batch_lots?.length > 0 && (
                            <div>
                              📦 {doc.linked_batch_lots.length} lot
                              {doc.linked_batch_lots.length !== 1 ? "s" : ""}
                            </div>
                          )}
                          {!doc.linked_ingredient_ids?.length &&
                            !doc.linked_batch_lots?.length &&
                            "—"}
                        </td>
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 11,
                            color: C.inkLight,
                          }}
                        >
                          {fmtDate(doc.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ADD DOCUMENT TAB ──────────────────────────────────────────────── */}
      {!loading && activeTab === "add" && (
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 28,
            }}
          >
            <h3 style={{ margin: "0 0 22px", fontSize: 16, fontWeight: 700 }}>
              Add Food Safety Document
            </h3>

            {/* Document type */}
            <div style={{ marginBottom: 16 }}>
              <label style={sLabel}>Document Type *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DOC_TYPES.map((dt) => (
                  <button
                    key={dt.key}
                    onClick={() =>
                      setForm((f) => ({ ...f, food_doc_type: dt.key }))
                    }
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontFamily: "inherit",
                      background:
                        form.food_doc_type === dt.key ? dt.color : C.bg,
                      color: form.food_doc_type === dt.key ? "#fff" : C.inkMid,
                      border: `1px solid ${form.food_doc_type === dt.key ? dt.color : C.border}`,
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: form.food_doc_type === dt.key ? 700 : 400,
                    }}
                  >
                    {dt.icon} {dt.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div>
                <label style={sLabel}>Document Name *</label>
                <input
                  value={form.document_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, document_name: e.target.value }))
                  }
                  placeholder="e.g. FSCA Certificate of Registration 2026"
                  style={sInput}
                />
              </div>
              <div>
                <label style={sLabel}>Certificate / Ref Number</label>
                <input
                  value={form.certificate_number}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      certificate_number: e.target.value,
                    }))
                  }
                  placeholder="e.g. FSCA/2026/001234"
                  style={sInput}
                />
              </div>
              <div>
                <label style={sLabel}>Issuing Authority</label>
                <input
                  value={form.issuing_authority}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      issuing_authority: e.target.value,
                    }))
                  }
                  placeholder="e.g. Food Safety Control Authority (FSCA)"
                  style={sInput}
                />
              </div>
              <div>
                <label style={sLabel}>
                  Expiry Date{" "}
                  <InfoTooltip
                    title="Expiry Date"
                    body="Alert fires 30 days before expiry, red at 7 days. Leave blank for documents with no expiry."
                  />
                </label>
                <input
                  type="date"
                  value={form.cert_expiry_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cert_expiry_date: e.target.value }))
                  }
                  style={sInput}
                />
              </div>
              <div>
                <label style={sLabel}>Accreditation Body</label>
                <input
                  value={form.accreditation_body}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      accreditation_body: e.target.value,
                    }))
                  }
                  placeholder="e.g. SANAS, ISO 17025"
                  style={sInput}
                />
              </div>
              <div>
                <label style={sLabel}>Scope of Certification</label>
                <input
                  value={form.scope_of_cert}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scope_of_cert: e.target.value }))
                  }
                  placeholder="e.g. Cold beverage manufacturing"
                  style={sInput}
                />
              </div>
            </div>

            {/* Link to ingredients */}
            <div style={{ marginBottom: 14 }}>
              <label style={sLabel}>
                Link to Ingredients (optional)
                <InfoTooltip
                  title="Link to Ingredients"
                  body="Select ingredients this certificate covers — e.g. an allergen test covers specific ingredients. Enables trace queries."
                />
              </label>
              <select
                multiple
                value={form.linked_ingredient_ids}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    linked_ingredient_ids: Array.from(
                      e.target.selectedOptions,
                      (o) => o.value,
                    ),
                  }))
                }
                style={{ ...sInput, height: 100 }}
              >
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: C.inkLight, marginTop: 4 }}>
                Hold Ctrl/Cmd to select multiple
              </div>
            </div>

            {/* Link to batch lots */}
            <div style={{ marginBottom: 14 }}>
              <label style={sLabel}>
                Link to Batch Lot Numbers (comma-separated)
              </label>
              <input
                value={form.linked_batch_lots}
                onChange={(e) =>
                  setForm((f) => ({ ...f, linked_batch_lots: e.target.value }))
                }
                placeholder="e.g. LOT-20260325-001, LOT-20260325-002"
                style={sInput}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={sLabel}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any additional notes about this document…"
                rows={2}
                style={{ ...sInput, resize: "vertical" }}
              />
            </div>

            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  setForm(emptyForm);
                  setActiveTab("vault");
                }}
                style={{
                  padding: "10px 20px",
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  color: C.inkMid,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 24px",
                  background: saving ? C.border : C.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                {saving ? "Saving…" : "Add to Vault"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPIRY TRACKER TAB ────────────────────────────────────────────── */}
      {!loading && activeTab === "expiry" && (
        <div>
          {/* Expired */}
          {docs.filter(
            (d) =>
              daysUntil(d.cert_expiry_date) !== null &&
              daysUntil(d.cert_expiry_date) < 0,
          ).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.red,
                  marginBottom: 12,
                }}
              >
                🔴 EXPIRED — Immediate action required
              </div>
              {docs
                .filter(
                  (d) =>
                    daysUntil(d.cert_expiry_date) !== null &&
                    daysUntil(d.cert_expiry_date) < 0,
                )
                .map((doc) => {
                  const dt = getDocType(doc.food_doc_type);
                  return (
                    <div
                      key={doc.id}
                      style={{
                        background: C.redBg,
                        border: "1px solid #FECACA",
                        borderRadius: 8,
                        padding: "14px 18px",
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: C.red,
                          }}
                        >
                          {doc.document_name}
                        </div>
                        <div
                          style={{ fontSize: 12, color: C.red, marginTop: 2 }}
                        >
                          {dt.icon} {dt.label} · Expired{" "}
                          {fmtDate(doc.cert_expiry_date)} ·{" "}
                          {doc.issuing_authority || "No authority recorded"}
                        </div>
                      </div>
                      <span
                        style={{
                          background: C.red,
                          color: "#fff",
                          borderRadius: 4,
                          padding: "3px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        EXPIRED
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Expiring soon */}
          {docs.filter((d) => {
            const x = daysUntil(d.cert_expiry_date);
            return x !== null && x >= 0 && x <= 30;
          }).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.amber,
                  marginBottom: 12,
                }}
              >
                ⚠️ Expiring within 30 days — action required
              </div>
              {docs
                .filter((d) => {
                  const x = daysUntil(d.cert_expiry_date);
                  return x !== null && x >= 0 && x <= 30;
                })
                .sort(
                  (a, b) =>
                    new Date(a.cert_expiry_date) - new Date(b.cert_expiry_date),
                )
                .map((doc) => {
                  const dt = getDocType(doc.food_doc_type);
                  const days = daysUntil(doc.cert_expiry_date);
                  const exp = expiryColor(days);
                  return (
                    <div
                      key={doc.id}
                      style={{
                        background: exp.bg,
                        border: `1px solid ${exp.color}30`,
                        borderRadius: 8,
                        padding: "14px 18px",
                        marginBottom: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {doc.document_name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: C.inkMid,
                            marginTop: 2,
                          }}
                        >
                          {dt.icon} {dt.label} · Expires{" "}
                          {fmtDate(doc.cert_expiry_date)} ·{" "}
                          {doc.issuing_authority || "—"}
                        </div>
                      </div>
                      <span
                        style={{
                          background: exp.bg,
                          color: exp.color,
                          border: `1px solid ${exp.color}30`,
                          borderRadius: 4,
                          padding: "3px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {exp.label}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          {kpis.expired === 0 && kpis.expiring30 === 0 && (
            <div
              style={{
                background: C.accentBg,
                border: `1px solid ${C.accent}30`,
                borderRadius: 10,
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>
                All certificates are current
              </div>
              <div style={{ fontSize: 13, color: C.inkMid, marginTop: 6 }}>
                No certificates expired or expiring within 30 days.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENT REGISTER TAB ─────────────────────────────────────────── */}
      {!loading && activeTab === "register" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {DOC_TYPES.map((dt) => {
              const count = docs.filter(
                (d) => d.food_doc_type === dt.key,
              ).length;
              if (count === 0) return null;
              return (
                <div
                  key={dt.key}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{dt.icon}</span>
                  <div>
                    <div
                      style={{ fontWeight: 700, fontSize: 14, color: dt.color }}
                    >
                      {count}
                    </div>
                    <div style={{ fontSize: 12, color: C.inkMid }}>
                      {dt.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {docs.length === 0 && (
            <div
              style={{
                color: C.inkLight,
                fontSize: 14,
                textAlign: "center",
                padding: 40,
              }}
            >
              No documents in the vault yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
