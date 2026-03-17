// AdminHRPanel.js v1.0
// Protea Botanicals · HR Module · Admin HR Panel Container
// WP-HR-2 · March 2026
// NEW FILE — src/components/AdminHRPanel.js

import React, { useState } from "react";
import { usePageContext } from "../hooks/usePageContext";
import WorkflowGuide from "./WorkflowGuide";
import HRStaffDirectory from "./hq/HRStaffDirectory";

// ─── Sub-tab config ────────────────────────────────────────────────────────────
// Placeholders for WP-HR-3 through WP-HR-9 are shown as locked tabs.
// They will be replaced with live components as each WP completes.
const SUB_TABS = [
  { id: "staff", label: "👥 Staff", live: true, wp: null },
  { id: "leave", label: "🗓 Leave", live: false, wp: "WP-HR-3" },
  { id: "timesheets", label: "⏱ Timesheets", live: false, wp: "WP-HR-4" },
  { id: "contracts", label: "📋 Contracts", live: false, wp: "WP-HR-5" },
  { id: "disciplinary", label: "⚠ Disciplinary", live: false, wp: "WP-HR-6" },
];

const s = {
  wrapper: {
    fontFamily: "'Jost', sans-serif",
    color: "#2d2d2d",
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: "#2d2d2d",
    margin: "0 0 4px 0",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: "#9a9a9a",
    margin: "0 0 20px 0",
  },
  tabBar: {
    display: "flex",
    gap: 0,
    borderBottom: "2px solid #ece8e2",
    marginBottom: 24,
    overflowX: "auto",
  },
  tab: (active, live) => ({
    padding: "9px 18px",
    cursor: live ? "pointer" : "not-allowed",
    border: "none",
    background: "none",
    fontSize: 13,
    fontFamily: "'Jost', sans-serif",
    color: active ? "#3d6b35" : live ? "#555" : "#bbb",
    borderBottom: active ? "2px solid #3d6b35" : "2px solid transparent",
    fontWeight: active ? 700 : 400,
    whiteSpace: "nowrap",
    marginBottom: -2,
    transition: "color 0.15s, border-color 0.15s",
    display: "flex",
    alignItems: "center",
    gap: 6,
  }),
  lockIcon: {
    fontSize: 10,
    opacity: 0.5,
  },
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "64px 40px",
    background: "#faf9f7",
    border: "1px dashed #d8d3cc",
    borderRadius: 8,
    textAlign: "center",
    gap: 8,
  },
  placeholderIcon: {
    fontSize: 42,
    marginBottom: 4,
    opacity: 0.5,
  },
  placeholderTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 20,
    fontWeight: 600,
    color: "#b0a898",
    margin: 0,
  },
  placeholderWp: {
    fontSize: 12,
    color: "#c5bfb5",
    background: "#f0ece6",
    padding: "3px 10px",
    borderRadius: 20,
    fontWeight: 600,
    letterSpacing: "0.04em",
  },
  placeholderText: {
    fontSize: 13,
    color: "#bbb",
    margin: 0,
    maxWidth: 320,
    lineHeight: 1.5,
  },
};

export default function AdminHRPanel({ tenantId, user }) {
  const [activeTab, setActiveTab] = useState("staff");
  const ctx = usePageContext("hr-staff", tenantId);

  const activeTabDef = SUB_TABS.find((t) => t.id === activeTab);

  return (
    <div style={s.wrapper}>
      {/* WorkflowGuide — live context from usePageContext('hr-staff') */}
      <WorkflowGuide context={ctx} defaultOpen={true} />

      {/* Header */}
      <div style={s.header}>
        <h2 style={s.title}>HR Management</h2>
        <p style={s.subtitle}>
          Staff records, leave, timesheets &amp; compliance for your team
        </p>
      </div>

      {/* Sub-tab bar */}
      <div style={s.tabBar}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            style={s.tab(activeTab === tab.id, tab.live)}
            onClick={() => tab.live && setActiveTab(tab.id)}
            title={!tab.live ? `Coming in ${tab.wp}` : undefined}
          >
            {tab.label}
            {!tab.live && <span style={s.lockIcon}>🔒</span>}
          </button>
        ))}
      </div>

      {/* Staff Directory — live */}
      {activeTab === "staff" && (
        <HRStaffDirectory tenantId={tenantId} user={user} />
      )}

      {/* Placeholder tabs */}
      {activeTabDef && !activeTabDef.live && (
        <div style={s.placeholder}>
          <div style={s.placeholderIcon}>
            {activeTabDef.label.split(" ")[0]}
          </div>
          <h3 style={s.placeholderTitle}>
            {activeTabDef.label.replace(/^[^\s]+\s/, "")} Module
          </h3>
          <span style={s.placeholderWp}>{activeTabDef.wp}</span>
          <p style={s.placeholderText}>
            This module is coming in the next HR work package. Staff Directory
            is live now — start by adding your team members.
          </p>
        </div>
      )}
    </div>
  );
}
