// src/components/PageShell.js — Protea Botanicals v1.0
// ─────────────────────────────────────────────────────────────────────────────
// Shared layout shell for all "with nav" pages.
// Provides: Google Fonts injection, cream background, max-width content area,
//           consistent padding, and branded footer.
// Does NOT provide: NavBar (handled by WithNav in App.js), auth logic
//           (handled by RequireAuth in App.js).
// Usage: Wrap page content → <PageShell><YourPage /></PageShell>
// ─────────────────────────────────────────────────────────────────────────────

import { FONTS, C } from "../styles/tokens";

// Inject Google Fonts once
const fontsInjected = (() => {
  if (typeof document !== "undefined") {
    const id = "protea-fonts";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = FONTS;
      document.head.appendChild(style);
    }
  }
  return true;
})();

export default function PageShell({
  children,
  maxWidth = 900,
  noPadding = false,
}) {
  // fontsInjected keeps the IIFE from being tree-shaken
  void fontsInjected;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px)", // 56px = NavBar height from App.js v3.2
        background: C.cream,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Jost, sans-serif",
      }}
    >
      {/* ── Page content area ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: `${maxWidth}px`,
          margin: "0 auto",
          padding: noPadding ? "0" : "40px 24px",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: C.footer,
          padding: "48px 24px 32px",
          marginTop: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "32px",
          }}
        >
          {/* Brand column */}
          <div style={{ minWidth: "200px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "20px",
                fontWeight: "700",
                color: C.gold,
                letterSpacing: "0.05em",
                marginBottom: "8px",
              }}
            >
              Protea Botanicals
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.4)",
                fontFamily: "Jost, sans-serif",
                lineHeight: "1.6",
              }}
            >
              Premium Cannabis Extracts
              <br />
              Pharmaceutical-Grade THC Distillate
            </div>
          </div>

          {/* Quick links column */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Shop", href: "/shop" },
              { label: "Verify Product", href: "/verify/pineapple-express" },
              { label: "Loyalty", href: "/loyalty" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  color: "rgba(255,255,255,0.5)",
                  textDecoration: "none",
                  fontFamily: "Jost, sans-serif",
                  fontSize: "11px",
                  fontWeight: "600",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.target.style.color = C.gold)}
                onMouseLeave={(e) =>
                  (e.target.style.color = "rgba(255,255,255,0.5)")
                }
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright bar */}
        <div
          style={{
            maxWidth: "900px",
            margin: "32px auto 0",
            paddingTop: "20px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.3)",
              fontFamily: "Jost, sans-serif",
              letterSpacing: "0.05em",
            }}
          >
            © {new Date().getFullYear()} Protea Botanicals. All rights reserved.
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.2)",
              fontFamily: "Jost, sans-serif",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            South Africa
          </span>
        </div>
      </footer>
    </div>
  );
}
