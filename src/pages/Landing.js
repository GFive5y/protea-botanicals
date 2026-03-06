// src/pages/Landing.js v5.8
// v5.8: Terpene modal fix (DEC-024).
//       TerpeneCarousel hex click no longer navigates to /terpenes/:id.
//       Instead: activeTerp state lifts to Landing, TerpeneModal overlays
//       Landing in-place (same pattern as MoleculeModal). URL stays at /.
//       NavBar stays cream. Background stays Landing content, frosted.
//       Changes: import TerpeneModal + TERPENES, add activeTerp state,
//       pass onSelect to TerpeneCarousel, render TerpeneModal overlay.
// v5.7: Header hides on scroll down (past 300px), reappears on scroll up.
// v5.6: Terpene section — added "THE ENTOURAGE EFFECT" eyebrow label.
// v5.5: Delta-9-THC molecule integration.
// v5.4: Video background on distillate section.
// v5.3: AgeGate + PromoBanner.
// v5.2: Auth-aware header, fixed invisible text when not scrolled.
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useContext, useRef } from "react";
import { RoleContext } from "../App";
import { supabase } from "../services/supabaseClient";
import AgeGate from "../components/AgeGate";
import PromoBanner from "../components/PromoBanner";
import MoleculePulse from "../components/MoleculePulse";
import MoleculeModal from "../components/MoleculeModal";
import TerpeneCarousel from "../components/TerpeneCarousel";
// v5.8: shared modal + data (DEC-024)
import TerpeneModal, { TERPENES } from "../components/TerpeneModal";

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const promo = searchParams.get("promo");
  const ctx = useContext(RoleContext);
  const role = typeof ctx === "string" ? ctx : ctx?.role || null; // eslint-disable-line no-unused-vars
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [modalMolId, setModalMolId] = useState(null);
  // v5.8: terpene modal state — id of active terpene, null = closed
  const [activeTerp, setActiveTerp] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const cardsRef = useRef(null);
  const [, setVisibleSections] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      const threshold = cardsRef.current
        ? cardsRef.current.getBoundingClientRect().top + y - 52
        : 9999;
      if (y > threshold) {
        setHeaderVisible(y < lastY);
      } else {
        setHeaderVisible(true);
      }
      lastY = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting)
            setVisibleSections((p) => ({ ...p, [e.target.id]: true }));
        });
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const cards = [
    {
      icon: "◈",
      title: "Scan & Earn",
      subtitle: "QR Voucher",
      desc: "Scan any Protea Botanicals product to verify authenticity, earn loyalty points and redeem exclusive rewards.",
      cta: "Log In to Scan & Earn",
      path: "/account",
      accent: "#2d6a4f",
      bg: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
    },
    {
      icon: "◉",
      title: "Shop Online",
      subtitle: "Our Products",
      desc: "Browse our full range of premium botanical extracts, vapes, wellness products and lifestyle accessories.",
      cta: "Browse Shop",
      path: "/shop",
      accent: "#b5935a",
      bg: "linear-gradient(135deg, #7c5a2a 0%, #b5935a 100%)",
    },
    {
      icon: "◎",
      title: "Wholesale",
      subtitle: "Retailer Portal",
      desc: "Access trade pricing, manage bulk orders, track inventory and redeem customer vouchers in-store.",
      cta: "Retailer Login",
      path: "/wholesale",
      accent: "#4a7fb5",
      bg: "linear-gradient(135deg, #1e3a5f 0%, #4a7fb5 100%)",
    },
  ];

  const contentSections = [
    {
      id: "co2",
      icon: "◈",
      label: "THE PROCESS",
      title: "Supercritical CO₂ Extraction",
      color: "#b5935a",
      body: `Supercritical CO₂ extraction is widely regarded as the gold standard in botanical extraction technology. Unlike solvent-based methods that can leave residual chemicals in the final product, CO₂ extraction uses carbon dioxide under precise temperature and pressure conditions to act as a solvent — then evaporates completely, leaving zero residue.\n\nThe process preserves the full spectrum of beneficial compounds including cannabinoids and terpenes, producing an exceptionally clean extract with superior flavour and effect profiles. Our extraction facility operates under strict quality control protocols, ensuring every batch meets the highest standards of purity and consistency.`,
    },
    {
      id: "thc",
      icon: "⬡",
      label: "THE MOLECULE",
      title: "Understanding THC",
      color: "#2d6a4f",
      body: `Tetrahydrocannabinol (THC) is the primary psychoactive compound found in the cannabis plant. At Protea Botanicals, we work exclusively with pharmaceutical-grade THC distillate — refined to 90%+ purity through a rigorous multi-stage process that removes all unwanted plant material, waxes and chlorophyll.\n\nThe result is a clean, potent, consistently dosed extract that delivers a predictable and enjoyable experience every time. Our THC distillate is lab-certified by accredited South African laboratories, with full Certificates of Analysis (COA) available by scanning any product QR code.`,
    },
    {
      id: "terpenes",
      icon: "❋",
      label: "THE FLAVOUR",
      title: "Terpenes & Their Effects",
      color: "#6b5b9e",
      body: `Terpenes are the aromatic compounds found in plants — including cannabis — that give each strain its distinctive scent, flavour and effect profile. Far from being merely cosmetic, terpenes interact synergistically with cannabinoids in what is known as the "entourage effect", meaningfully shaping the overall experience.\n\nAt Protea Botanicals we source only pharmaceutical-grade terpene profiles, each with their own Certificate of Analysis. We use precisely calibrated terpene blends to craft consistent, reliable and enjoyable products.`,
    },
  ];

  const _terpenes = [
    // eslint-disable-line no-unused-vars
    {
      name: "Myrcene",
      aroma: "Earthy, Musky, Herbal",
      effect: "Relaxing · Sedative · Body calm",
      color: "#2d6a4f",
      icon: "○",
    },
    {
      name: "Limonene",
      aroma: "Citrus, Lemon, Fresh",
      effect: "Uplifting · Mood boost · Anti-anxiety",
      color: "#b5935a",
      icon: "◎",
    },
    {
      name: "Pinene",
      aroma: "Pine, Fresh, Woody",
      effect: "Alert · Memory · Counteracts THC",
      color: "#4a7fb5",
      icon: "△",
    },
    {
      name: "Linalool",
      aroma: "Floral, Lavender, Sweet",
      effect: "Calming · Anti-stress · Sleep aid",
      color: "#9b6b9e",
      icon: "✦",
    },
    {
      name: "Caryophyllene",
      aroma: "Spicy, Pepper, Woody",
      effect: "Anti-inflammatory · Analgesic",
      color: "#c0764a",
      icon: "◆",
    },
    {
      name: "Terpinolene",
      aroma: "Floral, Piney, Herbal",
      effect: "Uplifting · Creative · Energetic",
      color: "#5a9e7c",
      icon: "◇",
    },
  ];

  const renderTHCSection = (sec) => (
    <div style={{ maxWidth: "800px", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "24px", color: sec.color }}>{sec.icon}</span>
        <span
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: sec.color,
            fontWeight: 500,
          }}
        >
          {sec.label}
        </span>
      </div>
      <h2
        className="landing-font"
        style={{
          fontSize: "clamp(32px, 5vw, 52px)",
          fontWeight: 300,
          color: "#1a1a1a",
          marginBottom: "32px",
          lineHeight: 1.2,
        }}
      >
        {sec.title}
      </h2>
      <div
        style={{
          width: "48px",
          height: "2px",
          background: sec.color,
          marginBottom: "32px",
        }}
      />
      {sec.body.split("\n\n").map((para, i) => (
        <p
          key={i}
          className="body-font"
          style={{
            fontSize: "17px",
            lineHeight: 1.9,
            color: "#555",
            fontWeight: 300,
            marginBottom: "20px",
            maxWidth: "800px",
          }}
        >
          {para}
        </p>
      ))}
      <div style={{ marginTop: "48px" }}>
        <MoleculePulse onSelect={(id) => setModalMolId(id)} />
      </div>
    </div>
  );

  const renderDefaultSection = (sec) => (
    <div style={{ maxWidth: "800px", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "24px", color: sec.color }}>{sec.icon}</span>
        <span
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: sec.color,
            fontWeight: 500,
          }}
        >
          {sec.label}
        </span>
      </div>
      <h2
        className="landing-font"
        style={{
          fontSize: "clamp(32px, 5vw, 52px)",
          fontWeight: 300,
          color: "#1a1a1a",
          marginBottom: "32px",
          lineHeight: 1.2,
        }}
      >
        {sec.title}
      </h2>
      <div
        style={{
          width: "48px",
          height: "2px",
          background: sec.color,
          marginBottom: "32px",
        }}
      />
      {sec.body.split("\n\n").map((para, i) => (
        <p
          key={i}
          className="body-font"
          style={{
            fontSize: "17px",
            lineHeight: 1.9,
            color: "#555",
            fontWeight: 300,
            marginBottom: "20px",
          }}
        >
          {para}
        </p>
      ))}
    </div>
  );

  return (
    <AgeGate>
      <div
        style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          background: "#faf9f6",
          color: "#1a1a1a",
          overflowX: "hidden",
        }}
      >
        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .landing-font { font-family: 'Cormorant Garamond', Georgia, serif; }
        .body-font { font-family: 'Jost', sans-serif; }
        .portal-card { transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease; cursor: pointer; }
        .portal-card:hover { transform: translateY(-12px) scale(1.03); box-shadow: 0 32px 64px rgba(0,0,0,0.18) !important; }
        .portal-card:hover .card-cta { letter-spacing: 3px; }
        .card-cta { transition: letter-spacing 0.3s ease; }
        .reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.8s ease, transform 0.8s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .terpene-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .terpene-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,0.12); }
        .scroll-indicator { animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
        .grain { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; opacity: 0.025; z-index: 999; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E"); }
        .hero-leaf { animation: sway 6s ease-in-out infinite; }
        @keyframes sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        section { position: relative; }
        .signin-btn:hover { background: ${scrolled ? "rgba(255,255,255,0.2)" : "rgba(27,67,50,0.1)"} !important; }
      `}</style>

        <div className="grain" />

        <PromoBanner promo={promo} onNavigate={navigate} />

        {/* ── Floating header ── */}
        <header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: scrolled ? "rgba(27,67,50,0.95)" : "rgba(27,67,50,0.0)",
            backdropFilter: scrolled ? "blur(8px)" : "none",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
            transition:
              "background 0.4s ease, backdrop-filter 0.4s ease, transform 0.35s ease",
            borderBottom: scrolled ? "1px solid rgba(82,183,136,0.15)" : "none",
          }}
        >
          <span
            className="landing-font"
            style={{
              fontSize: "15px",
              color: scrolled ? "#faf9f6" : "#1a1a1a",
              letterSpacing: "0.2em",
              opacity: scrolled ? 1 : 0.85,
              transition: "opacity 0.4s ease, color 0.4s ease",
            }}
          >
            PROTEA{" "}
            <span style={{ color: scrolled ? "#52b788" : "#2d6a4f" }}>
              BOTANICALS
            </span>
          </span>
          <button
            className="signin-btn body-font"
            onClick={() => navigate(isLoggedIn ? "/loyalty" : "/account")}
            style={{
              background: scrolled
                ? "rgba(255,255,255,0.1)"
                : "rgba(27,67,50,0.08)",
              border: scrolled
                ? "1px solid rgba(255,255,255,0.3)"
                : "1px solid rgba(27,67,50,0.3)",
              borderRadius: "2px",
              padding: "6px 16px",
              color: scrolled ? "#fff" : "#1b4332",
              fontFamily: "Jost, sans-serif",
              fontSize: "10px",
              fontWeight: "500",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background 0.2s, color 0.4s, border-color 0.4s",
            }}
          >
            {isLoggedIn ? "My Account" : "Sign In"}
          </button>
        </header>

        {/* ── HERO ── */}
        <section
          style={{
            minHeight: "100vh",
            background:
              "linear-gradient(160deg, #faf9f6 0%, #f0ebe1 40%, #e8f5ee 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "500px",
              height: "500px",
              opacity: 0.04,
              fontSize: "400px",
              lineHeight: 1,
              userSelect: "none",
              overflow: "hidden",
            }}
          >
            🌿
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "300px",
              height: "300px",
              opacity: 0.04,
              fontSize: "260px",
              lineHeight: 1,
              userSelect: "none",
              overflow: "hidden",
            }}
          >
            ❋
          </div>

          <div style={{ marginBottom: "32px", textAlign: "center" }}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              className="hero-leaf"
            >
              <defs>
                <linearGradient
                  id="leafGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#2d6a4f" />
                  <stop offset="100%" stopColor="#52b788" />
                </linearGradient>
              </defs>
              <ellipse
                cx="40"
                cy="40"
                rx="22"
                ry="34"
                fill="url(#leafGrad)"
                transform="rotate(-20 40 40)"
                opacity="0.9"
              />
              <ellipse
                cx="40"
                cy="40"
                rx="18"
                ry="28"
                fill="none"
                stroke="#1b4332"
                strokeWidth="1"
                transform="rotate(-20 40 40)"
                opacity="0.4"
              />
              <line
                x1="40"
                y1="14"
                x2="40"
                y2="66"
                stroke="#1b4332"
                strokeWidth="1.2"
                opacity="0.5"
                transform="rotate(-20 40 40)"
              />
              <line
                x1="40"
                y1="28"
                x2="32"
                y2="42"
                stroke="#1b4332"
                strokeWidth="0.8"
                opacity="0.4"
                transform="rotate(-20 40 40)"
              />
              <line
                x1="40"
                y1="36"
                x2="48"
                y2="48"
                stroke="#1b4332"
                strokeWidth="0.8"
                opacity="0.4"
                transform="rotate(-20 40 40)"
              />
              <ellipse
                cx="52"
                cy="32"
                rx="14"
                ry="22"
                fill="url(#leafGrad)"
                transform="rotate(15 52 32)"
                opacity="0.6"
              />
            </svg>
          </div>

          <h1
            className="landing-font"
            style={{
              fontSize: "clamp(42px, 8vw, 88px)",
              fontWeight: 300,
              letterSpacing: "0.12em",
              color: "#1a1a1a",
              textAlign: "center",
              lineHeight: 1,
              marginBottom: "12px",
            }}
          >
            PROTEA
          </h1>
          <h1
            className="landing-font"
            style={{
              fontSize: "clamp(42px, 8vw, 88px)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "#2d6a4f",
              textAlign: "center",
              lineHeight: 1,
              marginBottom: "20px",
            }}
          >
            BOTANICALS
          </h1>
          <p
            className="body-font"
            style={{
              fontSize: "clamp(13px, 2vw, 16px)",
              letterSpacing: "0.3em",
              color: "#888",
              textTransform: "uppercase",
              marginBottom: "60px",
              textAlign: "center",
            }}
          >
            Premium Botanical Extracts &amp; Lifestyle
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "64px",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "1px",
                background: "linear-gradient(to right, transparent, #2d6a4f)",
              }}
            />
            <span style={{ color: "#2d6a4f", fontSize: "20px" }}>❋</span>
            <div
              style={{
                width: "60px",
                height: "1px",
                background: "linear-gradient(to left, transparent, #2d6a4f)",
              }}
            />
          </div>

          <p
            className="body-font"
            style={{
              maxWidth: "560px",
              textAlign: "center",
              fontSize: "clamp(15px, 2vw, 18px)",
              lineHeight: 1.9,
              color: "#555",
              fontWeight: 300,
              marginBottom: "80px",
            }}
          >
            We craft premium botanical extracts using supercritical CO₂
            technology, producing the cleanest, most consistent cannabis
            products available in South Africa. Every product is lab-certified,
            QR-verified and crafted with intention.
          </p>

          {/* Portal Cards */}
          <div
            ref={cardsRef}
            style={{
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
              justifyContent: "center",
              width: "100%",
              maxWidth: "1000px",
            }}
          >
            {cards.map((card) => (
              <div
                key={card.path}
                className="portal-card"
                onClick={() => navigate(card.path)}
                style={{
                  flex: "1",
                  minWidth: "260px",
                  maxWidth: "300px",
                  background: card.bg,
                  borderRadius: "4px",
                  padding: "40px 32px",
                  color: "white",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    marginBottom: "16px",
                    opacity: 0.6,
                  }}
                >
                  {card.icon}
                </div>
                <div
                  className="body-font"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    opacity: 0.7,
                    marginBottom: "8px",
                  }}
                >
                  {card.subtitle}
                </div>
                <h3
                  className="landing-font"
                  style={{
                    fontSize: "28px",
                    fontWeight: 400,
                    marginBottom: "16px",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  className="body-font"
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.7,
                    opacity: 0.85,
                    marginBottom: "32px",
                    fontWeight: 300,
                  }}
                >
                  {card.desc}
                </p>
                <div
                  className="card-cta body-font"
                  style={{
                    fontSize: "11px",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {card.cta} <span>→</span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: -20,
                    right: -20,
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.06)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: -30,
                    right: -10,
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.04)",
                  }}
                />
              </div>
            ))}
          </div>

          <div
            className="scroll-indicator"
            style={{
              position: "absolute",
              bottom: "32px",
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
            }}
          >
            <div
              className="body-font"
              style={{
                fontSize: "10px",
                letterSpacing: "0.3em",
                color: "#aaa",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Discover
            </div>
            <div style={{ color: "#2d6a4f", fontSize: "18px" }}>↓</div>
          </div>
        </section>

        {/* ── DISTILLATE VIDEO DIVIDER ── */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            height: "700px",
            background: "#1a1a1a",
          }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              minWidth: "100%",
              minHeight: "100%",
              width: "auto",
              height: "auto",
              transform: "translate(-50%, -50%)",
              objectFit: "cover",
              zIndex: 0,
            }}
          >
            <source src="/videos/distillate-bg.mp4" type="video/mp4" />
          </video>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "35px",
              background:
                "linear-gradient(to bottom, #faf9f6 0%, rgba(250,249,246,0) 100%)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "35px",
              background:
                "linear-gradient(to top, #faf9f6 0%, rgba(250,249,246,0) 100%)",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
        </section>

        {/* ── CONTENT SECTIONS ── */}
        {contentSections.map((sec, idx) => (
          <section
            key={sec.id}
            id={sec.id}
            className="reveal"
            style={{
              padding: "100px 24px",
              background: idx % 2 === 0 ? "#faf9f6" : "#f4f0e8",
              display: "flex",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
            ref={(el) => {
              if (el) {
                const o = new IntersectionObserver(
                  ([e]) => {
                    if (e.isIntersecting) el.classList.add("visible");
                  },
                  { threshold: 0.15 },
                );
                o.observe(el);
              }
            }}
          >
            {sec.id === "thc"
              ? renderTHCSection(sec)
              : renderDefaultSection(sec)}
          </section>
        ))}

        {/* ── TERPENES CAROUSEL ── */}
        {/* v5.8: onSelect lifts terpene id to Landing — no navigation (DEC-024) */}
        <section
          style={{
            padding: "100px 24px 80px",
            background: "#faf9f6",
            textAlign: "center",
          }}
          ref={(el) => {
            if (el) {
              const o = new IntersectionObserver(
                ([e]) => {
                  if (e.isIntersecting) el.classList.add("visible");
                },
                { threshold: 0.15 },
              );
              o.observe(el);
            }
          }}
        >
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "20px", color: "#52b788" }}>❋</span>
              <span
                className="body-font"
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: "#52b788",
                  fontWeight: 500,
                }}
              >
                THE ENTOURAGE EFFECT
              </span>
            </div>
            <h2
              className="landing-font"
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 300,
                color: "#1a1a1a",
                margin: "0 0 32px",
              }}
            >
              Our Terpene Profiles
            </h2>

            {/* v5.8: pass onSelect — carousel no longer navigates */}
            <TerpeneCarousel onSelect={(id) => setActiveTerp(id)} />
          </div>
        </section>

        {/* ── QUALITY PROMISE ── */}
        <section
          style={{
            padding: "100px 24px",
            background: "#faf9f6",
            textAlign: "center",
          }}
          ref={(el) => {
            if (el) {
              const o = new IntersectionObserver(
                ([e]) => {
                  if (e.isIntersecting) el.classList.add("visible");
                },
                { threshold: 0.15 },
              );
              o.observe(el);
            }
          }}
        >
          <div style={{ maxWidth: "700px", margin: "0 auto" }}>
            <span
              className="body-font"
              style={{
                fontSize: "11px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#2d6a4f",
              }}
            >
              OUR PROMISE
            </span>
            <h2
              className="landing-font"
              style={{
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 300,
                color: "#1a1a1a",
                margin: "16px 0 24px",
              }}
            >
              Verified. Certified. Transparent.
            </h2>
            <div
              style={{
                width: "48px",
                height: "2px",
                background: "#2d6a4f",
                margin: "0 auto 40px",
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "32px",
                marginBottom: "60px",
              }}
            >
              {[
                {
                  icon: "⬡",
                  label: "Lab Certified",
                  sub: "Every batch tested by accredited SA laboratories",
                },
                {
                  icon: "◈",
                  label: "QR Verified",
                  sub: "Scan any product to confirm authenticity instantly",
                },
                {
                  icon: "❋",
                  label: "CO₂ Extracted",
                  sub: "Zero solvent residue — the cleanest extraction method",
                },
                {
                  icon: "◎",
                  label: "Terpene Graded",
                  sub: "Pharmaceutical-grade terpenes with individual COA",
                },
              ].map((item) => (
                <div key={item.label} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "28px",
                      color: "#2d6a4f",
                      marginBottom: "12px",
                    }}
                  >
                    {item.icon}
                  </div>
                  <div
                    className="landing-font"
                    style={{
                      fontSize: "18px",
                      color: "#1a1a1a",
                      marginBottom: "8px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    className="body-font"
                    style={{
                      fontSize: "13px",
                      color: "#888",
                      lineHeight: 1.6,
                      fontWeight: 300,
                    }}
                  >
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/account")}
              className="body-font"
              style={{
                padding: "16px 48px",
                background: "#2d6a4f",
                color: "#faf9f6",
                border: "none",
                borderRadius: "2px",
                fontSize: "12px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontWeight: 500,
                transition: "background 0.3s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#1b4332")}
              onMouseLeave={(e) => (e.target.style.background = "#2d6a4f")}
            >
              Log In to Scan &amp; Earn
            </button>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer
          style={{
            background: "#1a1a1a",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <span
              className="landing-font"
              style={{
                fontSize: "22px",
                color: "#faf9f6",
                letterSpacing: "0.2em",
              }}
            >
              PROTEA
            </span>
            <span
              className="landing-font"
              style={{
                fontSize: "22px",
                color: "#52b788",
                letterSpacing: "0.2em",
              }}
            >
              {" "}
              BOTANICALS
            </span>
          </div>
          <p
            className="body-font"
            style={{
              fontSize: "12px",
              color: "#555",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "24px",
            }}
          >
            Premium Botanical Extracts &amp; Lifestyle
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "32px",
              flexWrap: "wrap",
              marginBottom: "32px",
            }}
          >
            {[
              ["Scan & Earn", "/account"],
              ["Shop", "/shop"],
              ["Wholesale", "/wholesale"],
              ["Admin", "/admin"],
            ].map(([label, path]) => (
              <span
                key={label}
                className="body-font"
                onClick={() => navigate(path)}
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#666",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#faf9f6")}
                onMouseLeave={(e) => (e.target.style.color = "#666")}
              >
                {label}
              </span>
            ))}
          </div>
          <p className="body-font" style={{ fontSize: "11px", color: "#444" }}>
            © 2026 Protea Botanicals. All rights reserved. · South Africa
          </p>
        </footer>

        {/* Molecule detail modal */}
        {modalMolId && (
          <MoleculeModal
            molId={modalMolId}
            onClose={() => setModalMolId(null)}
          />
        )}

        {/* v5.8: Terpene modal — in-place overlay on Landing, no navigation (DEC-024) */}
        {activeTerp && (
          <TerpeneModal
            terpene={TERPENES.find((t) => t.id === activeTerp)}
            onClose={() => setActiveTerp(null)}
          />
        )}
      </div>
    </AgeGate>
  );
}
