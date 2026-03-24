// src/components/AppShell.js — WP-NAV v1.3
// WP-AI-UNIFIED: DevErrorCapture wraps children for dev mode error capture
import React from "react";
import NavSidebar from "../components/NavSidebar";
import DevErrorCapture from "../components/DevErrorCapture";
import "./AppShell.css";
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
  return (
    <div className="app-shell">
      <NavSidebar />
      <main className="app-shell-content">
        <div
          style={{
            maxWidth,
            margin: "0 auto",
            padding: "28px 32px 48px",
            background: "#faf9f6",
            minHeight: "100%",
          }}
        >
          <DevErrorCapture>{children}</DevErrorCapture>
        </div>
      </main>
    </div>
  );
}
