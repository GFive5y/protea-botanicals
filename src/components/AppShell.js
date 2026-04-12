// src/components/AppShell.js — WP-NAV v1.3
// WP-AI-UNIFIED: DevErrorCapture wraps children for dev mode error capture
// WP-MULTISITE v1.0: floating HQ badge for operator sessions on client sites
import React from "react";
import NavSidebar from "../components/NavSidebar";
import DevErrorCapture from "../components/DevErrorCapture";
import ToastContainer from "./ToastContainer";
import "./AppShell.css";
import { useTenant } from "../services/tenantService"; // ✦ WP-MULTISITE
import { T } from "../styles/tokens";

/**
 * AppShell — WP-NAV v1.3
 *
 * Wraps every authenticated route. Renders NavSidebar on the left,
 * page content on the right with consistent padding + cream background.
 *
 * The inner padding div replaces what PageShell used to provide.
 * Max-width mirrors the old PageShell defaults per route type.
 *
 * Public routes (/, /shop, /scan, /verify, /terpenes, /cart,
 * /leaderboard, /account, /welcome) must NOT use AppShell.
 */
export default function AppShell({ children, maxWidth = 1400 }) {
  const { isOperator } = useTenant(); // ✦ WP-MULTISITE
  const hostname = window.location.hostname;
  const isOnClientSite =
    hostname !== "localhost" &&
    hostname !== "127.0.0.1" &&
    !hostname.includes("vercel.app");

  return (
    <div className="app-shell">
      {isOperator && isOnClientSite && (
        <a
          href="/hq"
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9999,
            background: "#0A0A0A",
            color: "#00E87A",
            border: "1px solid rgba(0,232,122,0.3)",
            borderRadius: 20,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "sans-serif",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          ← NuAi HQ
        </a>
      )}
      <NavSidebar />
      <main className="app-shell-content">
        <div
          style={{
            maxWidth,
            margin: "0 auto",
            padding: `${T.page.gutterY}px ${T.page.gutterX}px ${Math.round(T.page.gutterY * 1.2)}px`,
            background: T.bg,
            minHeight: "100%",
          }}
        >
          <DevErrorCapture>{children}</DevErrorCapture>
          <ToastContainer />
        </div>
      </main>
    </div>
  );
}
