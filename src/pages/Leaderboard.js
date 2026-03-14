// src/pages/Leaderboard.js — v1.0
// Public page — no RequireAuth.
// Top 20 monthly earners via get_monthly_leaderboard() RPC.
// Logged-in user sees own rank even if outside top 20.

import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";

const GREEN = "#2D5016";
const LIGHT_GRN = "#EDF4E5";
const GOLD = "#C9A84C";
const BG = "#F9F6F0";
const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };
const PODIUM_CLR = { 1: GOLD, 2: "#B0B0B0", 3: "#CD7F32" };
const PODIUM_H = { 1: 90, 2: 65, 3: 50 };

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const monthLabel = new Date().toLocaleString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    loadLeaderboard();
    loadCurrentUser();
  }, []);

  const loadLeaderboard = async () => {
    const { data, error } = await supabase.rpc("get_monthly_leaderboard");
    if (!error && data) setLeaders(data);
    setLoading(false);
  };

  const loadCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.rpc("get_user_monthly_rank", {
      p_user_id: user.id,
    });
    if (data && data.length > 0) setUserRank(data[0]);
  };

  const userInTop20 = leaders.some((l) => l.user_id === userId);

  const s = {
    page: {
      minHeight: "100vh",
      background: BG,
      fontFamily: "'Jost', sans-serif",
    },
    hero: {
      background: GREEN,
      color: "#fff",
      padding: "36px 20px 28px",
      textAlign: "center",
    },
    h1: {
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 38,
      margin: 0,
      fontWeight: 600,
      letterSpacing: 1,
    },
    sub: { margin: "8px 0 0", opacity: 0.85, fontSize: 16 },
    body: { maxWidth: 580, margin: "0 auto", padding: "24px 16px 48px" },
    hint: {
      textAlign: "center",
      color: "#999",
      fontSize: 12,
      marginBottom: 24,
    },
    card: {
      background: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
    },
    row: (isMe, idx) => ({
      display: "flex",
      alignItems: "center",
      padding: "14px 20px",
      background: isMe ? LIGHT_GRN : idx % 2 === 0 ? "#fff" : "#FAFAF8",
      borderBottom: "1px solid #f0ede7",
      fontWeight: isMe ? 700 : 400,
    }),
    rankBadge: (rank) => ({
      width: 34,
      minWidth: 34,
      textAlign: "center",
      fontSize: rank <= 3 ? 20 : 13,
      color: rank <= 3 ? "inherit" : "#888",
      marginRight: 12,
    }),
    name: (isMe) => ({
      flex: 1,
      fontSize: 15,
      color: isMe ? GREEN : "#2a2a2a",
    }),
    pts: { fontSize: 14, color: GREEN, fontWeight: 600 },
    myRow: {
      marginTop: 12,
      background: LIGHT_GRN,
      borderRadius: 12,
      padding: "14px 20px",
      display: "flex",
      alignItems: "center",
      border: `2px solid ${GREEN}`,
    },
    separator: {
      textAlign: "center",
      color: "#bbb",
      fontSize: 18,
      margin: "8px 0",
      letterSpacing: 4,
    },
    empty: { textAlign: "center", padding: "48px 20px", color: "#999" },
    back: {
      display: "block",
      textAlign: "center",
      marginTop: 28,
      color: GREEN,
      fontSize: 14,
      textDecoration: "none",
    },
  };

  const renderPodium = () => {
    if (leaders.length < 3) return null;
    const podiumOrder = [leaders[1], leaders[0], leaders[2]];
    const ranks = [2, 1, 3];
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: 10,
          marginBottom: 24,
        }}
      >
        {podiumOrder.map((l, i) => {
          const r = ranks[i];
          return (
            <div key={l.user_id} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 26, marginBottom: 4 }}>{MEDALS[r]}</div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: GREEN,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginBottom: 6,
                  padding: "0 4px",
                }}
              >
                {l.display_name}
              </div>
              <div
                style={{
                  background: PODIUM_CLR[r],
                  height: PODIUM_H[r],
                  borderRadius: "6px 6px 0 0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                <span>{Number(l.monthly_points).toLocaleString()}</span>
                <span style={{ fontSize: 10, opacity: 0.85 }}>pts</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Jost:wght@300;400;500;600&display=swap');`}</style>

      <div style={s.hero}>
        <h1 style={s.h1}>🏆 Monthly Leaderboard</h1>
        <p style={s.sub}>{monthLabel} — Top Earners</p>
      </div>

      <div style={s.body}>
        <p style={s.hint}>
          Resets on the 1st of every month · Earn points to climb the ranks
        </p>

        {loading ? (
          <p style={{ textAlign: "center", color: "#aaa", padding: 40 }}>
            Loading...
          </p>
        ) : leaders.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
            <p>No points earned this month yet — be the first!</p>
          </div>
        ) : (
          <>
            {renderPodium()}

            <div style={s.card}>
              {leaders.map((l, idx) => {
                const isMe = l.user_id === userId;
                return (
                  <div key={l.user_id} style={s.row(isMe, idx)}>
                    <span style={s.rankBadge(l.rank)}>
                      {MEDALS[l.rank] || `#${l.rank}`}
                    </span>
                    <span style={s.name(isMe)}>
                      {l.display_name}
                      {isMe ? " (You)" : ""}
                    </span>
                    <span style={s.pts}>
                      {Number(l.monthly_points).toLocaleString()} pts
                    </span>
                  </div>
                );
              })}
            </div>

            {userRank && !userInTop20 && (
              <>
                <div style={s.separator}>• • •</div>
                <div style={s.myRow}>
                  <span
                    style={{
                      ...s.rankBadge(userRank.rank),
                      marginRight: 12,
                      color: "#666",
                      fontSize: 13,
                    }}
                  >
                    #{userRank.rank}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: GREEN,
                      fontWeight: 700,
                    }}
                  >
                    You
                  </span>
                  <span style={s.pts}>
                    {Number(userRank.monthly_points || 0).toLocaleString()} pts
                  </span>
                </div>
              </>
            )}

            {!userId && (
              <p
                style={{
                  textAlign: "center",
                  marginTop: 14,
                  color: "#999",
                  fontSize: 13,
                }}
              >
                <a href="/account" style={{ color: GREEN, fontWeight: 600 }}>
                  Sign in
                </a>{" "}
                to see your rank
              </p>
            )}
          </>
        )}

        <a href="/loyalty" style={s.back}>
          ← Back to Loyalty
        </a>
      </div>
    </div>
  );
}
