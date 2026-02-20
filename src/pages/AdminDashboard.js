// src/pages/AdminDashboard.js - FIXED FOR NETLIFY BUILD (Super Grok v5.3)
import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import QrCode from "../components/QrCode";

export default function AdminDashboard() {
  const [batches, setBatches] = useState([]);
  const [newBatchNumber, setNewBatchNumber] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [analytics, setAnalytics] = useState({ totalScans: 0, totalPoints: 0 });

  useEffect(() => {
    fetchBatches();
    fetchAnalytics();
  }, []);

  const fetchBatches = async () => {
    const { data } = await supabase.from("batches").select("*");
    setBatches(data || []);
  };

  const fetchAnalytics = async () => {
    const { count: scans } = await supabase
      .from("scans")
      .select("*", { count: "exact" });
    const { data: pointsData } = await supabase
      .from("loyalty_transactions")
      .select("points");
    const totalPoints = pointsData
      ? pointsData.reduce((sum, t) => sum + t.points, 0)
      : 0;
    setAnalytics({ totalScans: scans || 0, totalPoints });
  };

  const createBatch = async () => {
    if (!newBatchNumber || !newProductName)
      return alert("Please fill all fields");

    const { error } = await supabase // ← 'data' removed (unused)
      .from("batches")
      .insert({
        batch_number: newBatchNumber,
        product_name: newProductName,
        lab_certified: true,
        coa_url: `https://example.com/coa/${newBatchNumber}.pdf`,
      })
      .select();

    if (error) {
      alert("Error creating batch: " + error.message);
      return;
    }

    fetchBatches();
    setNewBatchNumber("");
    setNewProductName("");
    alert("New batch created! QR code can be generated on the batch list.");
  };

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "40px",
        background: "#121212",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      <h1 style={{ color: "#fff" }}>Admin Dashboard</h1>

      {/* Analytics */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "40px" }}>
        <div
          style={{
            background: "#1e1e1e",
            padding: "20px",
            borderRadius: "12px",
            flex: 1,
          }}
        >
          <h3 style={{ color: "#fff" }}>Total Scans</h3>
          <div style={{ fontSize: "3rem", color: "#61dafb" }}>
            {analytics.totalScans}
          </div>
        </div>
        <div
          style={{
            background: "#1e1e1e",
            padding: "20px",
            borderRadius: "12px",
            flex: 1,
          }}
        >
          <h3 style={{ color: "#fff" }}>Total Points Awarded</h3>
          <div style={{ fontSize: "3rem", color: "#61dafb" }}>
            {analytics.totalPoints}
          </div>
        </div>
      </div>

      {/* Create New Batch */}
      <h2 style={{ color: "#fff", marginBottom: "15px" }}>Create New Batch</h2>
      <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <input
          type="text"
          placeholder="Batch Number (e.g. PB-002-2026-0001)"
          value={newBatchNumber}
          onChange={(e) => setNewBatchNumber(e.target.value)}
          style={{
            padding: "12px",
            flex: 1,
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #61dafb",
            borderRadius: "8px",
          }}
        />
        <input
          type="text"
          placeholder="Product Name"
          value={newProductName}
          onChange={(e) => setNewProductName(e.target.value)}
          style={{
            padding: "12px",
            flex: 1,
            background: "#1e1e1e",
            color: "#fff",
            border: "1px solid #61dafb",
            borderRadius: "8px",
          }}
        />
        <button
          onClick={createBatch}
          style={{
            padding: "12px 24px",
            background: "#61dafb",
            color: "#000",
            border: "none",
            borderRadius: "8px",
          }}
        >
          Create Batch
        </button>
      </div>

      {/* Batches List */}
      <h2 style={{ color: "#fff", marginBottom: "15px" }}>Batches List</h2>
      <div
        style={{ background: "#1e1e1e", padding: "20px", borderRadius: "12px" }}
      >
        {batches.map((b) => (
          <div
            key={b.id}
            style={{
              padding: "15px",
              borderBottom: "1px solid #444",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ color: "#fff" }}>
              <strong>{b.batch_number}</strong> — {b.product_name}
            </div>
            <div>
              <QrCode value={b.batch_number} size={120} />
              <a
                href={b.coa_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: "10px", color: "#61dafb" }}
              >
                View COA
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Wholesale Portal Placeholder */}
      <h2 style={{ color: "#fff", marginTop: "50px" }}>
        Wholesale Partner Portal
      </h2>
      <div
        style={{
          background: "#1e1e1e",
          padding: "30px",
          borderRadius: "12px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#fff" }}>
          Wholesale portal coming soon (login for partners, order management,
          pricing tiers)
        </p>
        <button
          style={{
            padding: "12px 32px",
            background: "#61dafb",
            color: "#000",
            border: "none",
            borderRadius: "8px",
          }}
        >
          Open Wholesale Portal
        </button>
      </div>
    </div>
  );
}
