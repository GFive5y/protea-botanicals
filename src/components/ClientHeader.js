// src/components/ClientHeader.js — Protea Botanicals WP-N v1.2
// ─────────────────────────────────────────────────────────────────────────────
// Unified client header. Replaces page-level navbars on:
//   Landing.js, Shop.js, Loyalty.js, ScanResult.js, Account.js
//
// ★ Scroll behaviour — ported exactly from NavBar v3.8:
//   · Unscrolled : cream bg rgba(250,249,246,0.97), dark green brand text, dark icons
//   · Scrolled   : green bg rgba(27,67,50,0.95), cream brand text, cream icons, blur(8px)
//   · Auto-hide  : hides on scroll-down past 300px, reappears on scroll-up
//   · Transitions: background 0.4s ease, colors 0.4s ease, transform 0.35s ease
//
// Props:
//   variant  'light'       (default) — cream→green scroll-aware  (Shop, Loyalty, Account)
//            'dark'                  — always green, no transition (ScanResult)
//            'transparent'           — hero bleed-through on load, then cream→green (Landing)
//                                      starts clear with cream text, snaps into light after 50px
//                                      spacer height = 0 so hero fills top of viewport
//
// Self-contained: renders fixed header + 60px spacer div.
// Pages do NOT need their own paddingTop.
//
// Confirmed import paths (from actual source files):
//   useCart             ← src/contexts/CartContext.js
//   supabase            ← src/services/supabaseClient.js
//   getInboxUnreadCount ← src/components/CustomerInbox.js
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useCart } from "../contexts/CartContext";
import { getInboxUnreadCount } from "./CustomerInbox";

const HEADER_HEIGHT = 60;

// ── Colour tokens ─────────────────────────────────────────────────────────────
const T = {
  bgLight: "rgba(250,249,246,0.97)", // cream unscrolled — exact from NavBar v3.8
  bgDark: "#173a2a", // green scrolled — solid, max contrast
  bgTransparent: "transparent", // Landing hero bleed-through — no bg at all
  borderLight: "1px solid #e8e0d4",
  borderDark: "1px solid rgba(82,183,136,0.20)",
  borderNone: "1px solid transparent", // transparent variant unscrolled
  brandLight: "#1b4332", // dark green unscrolled
  brandDark: "#ffffff", // full white scrolled — max legibility
  brandTransp: "#1b4332", // dark green over Landing's light cream hero
  fgLight: "#1a1a1a", // icons/text unscrolled
  fgDark: "#ffffff", // full white scrolled — max legibility
  green: "#1b4332",
  greenMid: "#2d6a4f",
  cream: "#faf9f6",
  sand: "#f0ebe3",
  text: "#1a1a1a",
  muted: "#888888",
  red: "#dc2626",
  red2: "#c0392b",
  border: "#e8e0d4",
  overlay: "rgba(0,0,0,0.45)",
};

const PUBLIC_LINKS = [
  { label: "Home", path: "/", icon: "🏠" },
  { label: "Shop", path: "/shop", icon: "🛍️" },
  { label: "My Loyalty", path: "/loyalty", icon: "⭐" },
  { label: "Scan QR", path: "/scan", icon: "📲" },
];

const ADMIN_LINKS = [
  { label: "Admin Dashboard", path: "/admin", icon: "⚙️" },
  { label: "HQ Dashboard", path: "/hq", icon: "🏢" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function ClientHeader({ variant = "light" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  // ── Scroll state — exact logic from NavBar v3.8 ───────────────────────────
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    if (variant === "dark") return; // dark = always green, no scroll transitions
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      if (y > 300) {
        setHeaderVisible(y < lastY); // hide on down, show on up
      } else {
        setHeaderVisible(true);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  // ── Auth / profile ────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadProfile = useCallback(async (userId) => {
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("full_name, role")
        .eq("id", userId)
        .single();
      if (data) {
        setProfile(data);
        const n = await getInboxUnreadCount(userId);
        setUnreadCount(n || 0);
      }
    } catch (err) {
      console.warn("[ClientHeader] profile load:", err);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else {
        setProfile(null);
        setUnreadCount(0);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // Poll unread every 60 s
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(async () => {
      const n = await getInboxUnreadCount(user.id);
      setUnreadCount(n || 0);
    }, 60_000);
    return () => clearInterval(iv);
  }, [user]);

  // ── Panel state ───────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close on outside click / Escape
  useEffect(() => {
    const onMouse = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setSearchOpen(false);
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Close all on route change
  useEffect(() => {
    setDrawerOpen(false);
    setDropdownOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  // ── Derived theme — three-way colour system ──────────────────────────────
  //
  //  variant='light'       : unscrolled=cream  → scrolled=green
  //  variant='dark'        : always green (ScanResult), no transitions
  //  variant='transparent' : unscrolled=clear+cream-text → scrolled=cream (Landing hero)
  //                          Once scrolled it behaves identically to 'light'
  //
  // "solidified" = the header has gained a background (scrolled, or always-dark)
  const solidified = variant === "dark" || scrolled;

  // unscrolled transparent = cream text over hero image
  const isTransparentUnscrolled = variant === "transparent" && !scrolled;

  // bg: dark=always green · light+scrolled=green · light+top=cream · transp+scrolled=green · transp+top=clear
  const bg =
    variant === "dark" || scrolled
      ? T.bgDark
      : variant === "transparent"
        ? T.bgTransparent
        : T.bgLight;

  const borderVal =
    variant === "dark" || scrolled
      ? T.borderDark
      : variant === "transparent"
        ? T.borderNone
        : T.borderLight;

  // Brand & icon colours:
  //   - dark variant    → always cream (green bg)
  //   - light scrolled  → cream (green bg)
  //   - light unscrolled→ dark green
  //   - transparent unscrolled → cream (over hero image)
  //   - transparent scrolled  → dark green (over cream bg, same as light)
  const brandColor =
    variant === "dark" || (variant === "light" && scrolled)
      ? T.brandDark // cream
      : isTransparentUnscrolled
        ? T.brandTransp // cream over hero
        : T.brandLight; // dark green

  const fg =
    variant === "dark" || (variant === "light" && scrolled)
      ? T.fgDark
      : isTransparentUnscrolled
        ? T.fgLight // dark icons over light hero
        : T.fgLight;

  const blurVal = solidified ? "blur(8px)" : "none";

  // Sign In button — transparent+unscrolled = light hero → dark green (NOT white)
  const signInBg = solidified
    ? "rgba(255,255,255,0.10)"
    : "rgba(27,67,50,0.06)";
  const signInBorder = solidified
    ? "1px solid rgba(255,255,255,0.30)"
    : "1px solid #1b4332";
  const signInColor = solidified ? "#fff" : "#1b4332";

  // isActive is kept for search-bar context styling (green vs sand bg)
  const isActive = solidified;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getInitials = (name) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

  const isStaff = profile?.role === "admin" || profile?.role === "hq";
  const isLinkActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const navTo = (path, state) => {
    navigate(path, state ? { state } : undefined);
    setDrawerOpen(false);
    setDropdownOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("protea_role");
    localStorage.removeItem("protea_dev_mode");
    navTo("/");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/shop?search=${encodeURIComponent(q)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  // Shared icon button — colour follows scroll state via `fg`
  const iconBtn = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: fg,
    padding: "6px 8px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    transition: "color 0.4s ease",
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: `${HEADER_HEIGHT}px`,
          background: bg,
          backdropFilter: blurVal,
          WebkitBackdropFilter: blurVal,
          borderBottom: borderVal,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          // ── Exact transitions from NavBar v3.8 ──
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition:
            "background 0.4s ease, border-color 0.4s ease, transform 0.35s ease, backdrop-filter 0.4s ease",
          fontFamily: "'Jost', sans-serif",
        }}
      >
        {/* Left group: Hamburger + Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{ ...iconBtn, padding: "8px 6px", flexShrink: 0 }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: "block",
                    width: 22,
                    height: 2,
                    background: fg,
                    borderRadius: 2,
                    transition: "background 0.4s ease",
                  }}
                />
              ))}
            </span>
          </button>

          {/* Wordmark — Cormorant Garamond, colour transitions with scroll */}
          <button
            onClick={() => navigate("/")}
            aria-label="Home"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(13px, 2.2vw, 17px)",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: brandColor,
              transition: "color 0.4s ease",
              padding: 0,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            Protea Botanicals
          </button>
        </div>

        {/* Right: Search · Cart · Avatar/SignIn */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          {/* Search */}
          <button
            onClick={() => {
              setSearchOpen((s) => !s);
              setDropdownOpen(false);
            }}
            aria-label="Search"
            title="Search products"
            style={{ ...iconBtn }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={fg}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: "stroke 0.4s ease", display: "block" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Cart — SVG stroke transitions with scroll, exact from NavBar v3.8 */}
          <button
            onClick={() => navigate("/cart")}
            aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
            style={{ ...iconBtn, position: "relative" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={fg}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: "stroke 0.4s ease", display: "block" }}
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  background: T.red2,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  pointerEvents: "none",
                  fontFamily: "'Jost', sans-serif",
                }}
              >
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

          {/* Avatar (logged in) */}
          {user ? (
            <div
              ref={dropdownRef}
              style={{ position: "relative", marginLeft: 2 }}
            >
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                style={{
                  background: T.greenMid,
                  border: "2px solid rgba(82,183,136,0.4)",
                  cursor: "pointer",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Jost', sans-serif",
                  letterSpacing: "0.02em",
                  position: "relative",
                  flexShrink: 0,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.08)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {getInitials(profile?.full_name || user.email)}
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      background: T.red2,
                      color: "#fff",
                      borderRadius: "50%",
                      fontSize: 9,
                      fontWeight: 700,
                      width: 16,
                      height: 16,
                      border: "2px solid #fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      lineHeight: 1,
                      fontFamily: "'Jost', sans-serif",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            /* Sign In pill — exact style + transitions from NavBar v3.8 */
            <button
              onClick={() => navigate("/account")}
              style={{
                background: signInBg,
                border: signInBorder,
                borderRadius: "2px",
                padding: "6px 16px",
                fontFamily: "'Jost', sans-serif",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: signInColor,
                cursor: "pointer",
                marginLeft: 4,
                transition:
                  "background 0.2s ease, color 0.4s ease, border-color 0.4s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isActive
                  ? "rgba(255,255,255,0.20)"
                  : "rgba(27,67,50,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = signInBg;
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* ── Spacer ────────────────────────────────────────────────────────── */}
      {/* transparent variant = 0px — hero bleeds under the header from the top */}
      {/* light / dark        = 60px — page content starts below the header    */}
      <div
        style={{
          height: variant === "transparent" ? 0 : `${HEADER_HEIGHT}px`,
          flexShrink: 0,
        }}
      />

      {/* ── Search bar — sticky below header when open ────────────────────── */}
      {searchOpen && (
        <div
          ref={searchRef}
          style={{
            position: "fixed",
            top: `${HEADER_HEIGHT}px`,
            left: 0,
            right: 0,
            zIndex: 999,
            background: isActive ? T.bgDark : T.sand,
            borderBottom: `1px solid ${isActive ? "rgba(82,183,136,0.15)" : T.border}`,
            backdropFilter: isActive ? "blur(8px)" : "none",
            padding: "10px 24px",
          }}
        >
          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              gap: 10,
              maxWidth: 640,
              margin: "0 auto",
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products, strains…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: "9px 14px",
                borderRadius: "2px",
                border: `1px solid ${isActive ? "rgba(255,255,255,0.25)" : "rgba(27,67,50,0.25)"}`,
                fontSize: 14,
                fontFamily: "'Jost', sans-serif",
                outline: "none",
                background: isActive ? "rgba(255,255,255,0.10)" : "#fff",
                color: isActive ? "#fff" : T.text,
              }}
            />
            <button
              type="submit"
              style={{
                background: T.green,
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                padding: "9px 20px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: "'Jost', sans-serif",
              }}
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              aria-label="Close search"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: isActive ? "rgba(255,255,255,0.6)" : T.muted,
                fontSize: 18,
                padding: "6px",
                lineHeight: 1,
                transition: "color 0.4s ease",
              }}
            >
              ✕
            </button>
          </form>
        </div>
      )}

      {/* ── Drawer overlay ────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: T.overlay,
            zIndex: 1200,
          }}
        />
      )}

      {/* ── Drawer panel — slides from left ──────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "min(320px, 85vw)",
          background: "#fff",
          zIndex: 1300,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "6px 0 32px rgba(0,0,0,0.18)",
          fontFamily: "'Jost', sans-serif",
          overflowY: "auto",
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            height: 60,
            background: T.green,
            flexShrink: 0,
            borderBottom: "1px solid rgba(82,183,136,0.2)",
          }}
        >
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#fff",
            }}
          >
            Protea Botanicals
          </span>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.75)",
              fontSize: 22,
              padding: "4px 6px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* User info strip */}
        {user && (
          <div
            style={{
              padding: "14px 20px",
              borderBottom: `1px solid rgba(27,67,50,0.08)`,
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#f6faf8",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: T.greenMid,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(profile?.full_name || user.email)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
                {profile?.full_name || "My Account"}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                {isStaff
                  ? profile?.role === "hq"
                    ? "HQ Staff"
                    : "Admin"
                  : "Customer"}
              </div>
            </div>
          </div>
        )}

        {/* Links */}
        <div style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {PUBLIC_LINKS.map((link) => {
            const act = isLinkActive(link.path);
            return (
              <button
                key={link.path}
                onClick={() => navTo(link.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  width: "100%",
                  padding: "13px 22px",
                  background: act ? "#f0f7f4" : "none",
                  border: "none",
                  borderLeft: act
                    ? `3px solid ${T.green}`
                    : "3px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 15,
                  fontWeight: act ? 600 : 400,
                  color: act ? T.green : T.text,
                  fontFamily: "'Jost', sans-serif",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!act) e.currentTarget.style.background = "#f6f6f4";
                }}
                onMouseLeave={(e) => {
                  if (!act) e.currentTarget.style.background = "none";
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1, minWidth: 22 }}>
                  {link.icon}
                </span>
                {link.label}
              </button>
            );
          })}

          {/* Account links — only when logged in */}
          {user && (
            <>
              <div
                style={{
                  margin: "10px 22px 6px",
                  paddingTop: 10,
                  borderTop: `1px solid rgba(27,67,50,0.10)`,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.muted,
                }}
              >
                My Account
              </div>
              {[
                { label: "Account Settings", path: "/account", icon: "👤" },
                { label: "My Loyalty", path: "/loyalty", icon: "⭐" },
                {
                  label: unreadCount > 0 ? `Inbox (${unreadCount})` : "Inbox",
                  path: "/account",
                  icon: unreadCount > 0 ? "📬" : "📭",
                  state: { tab: "inbox" },
                  badge: unreadCount,
                },
              ].map((item) => {
                const act = isLinkActive(item.path);
                return (
                  <button
                    key={item.label}
                    onClick={() => navTo(item.path, item.state)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      width: "100%",
                      padding: "12px 22px",
                      background: act ? "#f0f7f4" : "none",
                      border: "none",
                      borderLeft: act
                        ? `3px solid ${T.green}`
                        : "3px solid transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 14,
                      fontWeight: act ? 600 : 400,
                      color: act ? T.green : T.text,
                      fontFamily: "'Jost', sans-serif",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (!act) e.currentTarget.style.background = "#f6f6f4";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = act
                        ? "#f0f7f4"
                        : "none";
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1, minWidth: 22 }}>
                      {item.icon}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge > 0 && (
                      <span
                        style={{
                          background: T.red2,
                          color: "#fff",
                          borderRadius: 10,
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "1px 6px",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}

          {isStaff && (
            <>
              <div
                style={{
                  margin: "10px 22px 6px",
                  paddingTop: 10,
                  borderTop: `1px solid rgba(27,67,50,0.10)`,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: T.muted,
                }}
              >
                Staff
              </div>
              {ADMIN_LINKS.map((link) => {
                const act = isLinkActive(link.path);
                return (
                  <button
                    key={link.path}
                    onClick={() => navTo(link.path)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      width: "100%",
                      padding: "12px 22px",
                      background: act ? "#f0f7f4" : "none",
                      border: "none",
                      borderLeft: act
                        ? `3px solid ${T.green}`
                        : "3px solid transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 14,
                      fontWeight: 500,
                      color: act ? T.green : T.muted,
                      fontFamily: "'Jost', sans-serif",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f6f6f4";
                    }}
                    onMouseLeave={(e) => {
                      if (!act) e.currentTarget.style.background = "none";
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1, minWidth: 22 }}>
                      {link.icon}
                    </span>
                    {link.label}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Drawer footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid rgba(27,67,50,0.10)`,
            flexShrink: 0,
          }}
        >
          {user ? (
            <button
              onClick={handleSignOut}
              style={{
                background: "none",
                border: `1px solid rgba(192,57,43,0.35)`,
                borderRadius: "2px",
                cursor: "pointer",
                color: T.red2,
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: "'Jost', sans-serif",
                width: "100%",
                textAlign: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fef2f2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => {
                navigate("/account");
                setDrawerOpen(false);
              }}
              style={{
                background: T.green,
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: "'Jost', sans-serif",
                width: "100%",
                textAlign: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = T.greenMid;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = T.green;
              }}
            >
              Sign In / Create Account
            </button>
          )}
          <div
            style={{
              marginTop: 10,
              textAlign: "center",
              fontSize: 11,
              color: T.muted,
            }}
          >
            © {new Date().getFullYear()} Protea Botanicals
          </div>
        </div>
      </nav>
    </>
  );
}
