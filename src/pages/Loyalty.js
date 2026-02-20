// src/pages/Loyalty.js - CLEAN FINAL VERSION
import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export default function Loyalty() {
  const [points, setPoints] = useState(0);
  const [tier, setTier] = useState("bronze");
  const [history, setHistory] = useState([]);

  const fetchLoyalty = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("loyalty_points, loyalty_tier")
      .eq("id", user.id)
      .single();

    if (profile) {
      setPoints(profile.loyalty_points || 0);
      setTier(profile.loyalty_tier || "bronze");
    }

    const { data: transactions } = await supabase
      .from("loyalty_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false });

    setHistory(transactions || []);
  };

  useEffect(() => {
    fetchLoyalty();
  }, []);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px" }}>
      <h1>Your Loyalty Program</h1>

      <div
        style={{
          textAlign: "center",
          padding: "40px",
          background: "#282c34",
          borderRadius: "16px",
          margin: "30px 0",
        }}
      >
        <div style={{ fontSize: "5rem", fontWeight: "bold", color: "#61dafb" }}>
          {points}
        </div>
        <div style={{ fontSize: "1.5rem", color: "#61dafb" }}>Points</div>
        <div
          style={{
            marginTop: "15px",
            fontSize: "1.8rem",
            fontWeight: "bold",
            color: "#61dafb",
          }}
        >
          {tier.toUpperCase()} TIER
        </div>
      </div>

      <h2>Recent Activity</h2>
      <div
        style={{
          background: "#1e1e1e",
          padding: "20px",
          borderRadius: "12px",
          color: "#fff",
        }}
      >
        {history.length === 0 ? (
          <p>No transactions yet. Scan products to earn points!</p>
        ) : (
          history.map((t, i) => (
            <div
              key={i}
              style={{
                padding: "12px 0",
                borderBottom:
                  i < history.length - 1 ? "1px solid #444" : "none",
              }}
            >
              <strong>{t.transaction_type.toUpperCase()}</strong> — {t.points}{" "}
              points — {t.description}
              <br />
              <small>{new Date(t.transaction_date).toLocaleDateString()}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
