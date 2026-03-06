// src/pages/TerpenePage.js v3.2
// v3.2: Extract TERPENES data, TerpIcon and TerpeneModal into
//       src/components/TerpeneModal.js (shared with Landing.js per DEC-024).
//       Import them from there. Remove all local definitions.
//       No behaviour change for this page — /terpenes and /terpenes/:id work
//       identically to v3.1. Only the source of truth moved.
// v3.1: Reads useParams :terpeneId — auto-opens matching terpene modal on mount.
// v3.0: Two-row infinite carousel, hover pauses + enlarges, click opens modal.
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
// v3.2: shared component — single source of truth for data + modal
import TerpeneModal, { TERPENES, TerpIcon } from "../components/TerpeneModal";

const ROW_TOP = TERPENES.slice(0, 6);
const ROW_BOT = TERPENES.slice(6, 12);

const HEX_W = 140;
const HEX_GAP = 20;
const ITEM_W = HEX_W + HEX_GAP;
const SPEED_TOP = 35;
const SPEED_BOT = 40;

// ═══ HEX SVG ═══
const R = 58;
const CX = 70,
  CY = 78;
const sin60 = Math.sin(Math.PI / 3);
const cos60 = Math.cos(Math.PI / 3);
const VERTS = [
  [CX, CY - R],
  [CX + R * sin60, CY - R * cos60],
  [CX + R * sin60, CY + R * cos60],
  [CX, CY + R],
  [CX - R * sin60, CY + R * cos60],
  [CX - R * sin60, CY - R * cos60],
];
const hexPoints = VERTS.map((v) => `${v[0]},${v[1]}`).join(" ");

function edgePath(i) {
  const a = VERTS[i],
    b = VERTS[(i + 1) % 6];
  return `M${a[0]},${a[1]} L${b[0]},${b[1]}`;
}

const EDGE_OUT = [
  { x: 8, y: -14 },
  { x: 16, y: 0 },
  { x: 8, y: 14 },
  { x: -8, y: 14 },
  { x: -16, y: 0 },
  { x: -8, y: -14 },
];

// ═══ HEX CARD ═══
function TerpHex({
  terpene,
  isHovered,
  isAnyHovered,
  onHover,
  onLeave,
  onClick,
}) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        width: `${HEX_W}px`,
        height: "160px",
        cursor: "pointer",
        position: "relative",
        transition:
          "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.35s",
        transform: isHovered
          ? "scale(1.35)"
          : isAnyHovered
            ? "scale(0.92)"
            : "scale(1)",
        zIndex: isHovered ? 100 : 1,
        filter:
          isAnyHovered && !isHovered
            ? "brightness(0.75) saturate(0.5)"
            : "none",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 140 156"
        width={HEX_W}
        height="156"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter
            id={`gl-${terpene.id}`}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon
          points={hexPoints}
          fill={isHovered ? `${terpene.color}12` : "#faf9f6"}
          stroke="none"
          style={{ transition: "fill 0.35s" }}
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={edgePath(i)}
            fill="none"
            stroke={terpene.color}
            strokeWidth={isHovered ? "2.5" : "1.2"}
            strokeLinecap="round"
            filter={isHovered ? `url(#gl-${terpene.id})` : "none"}
            style={{
              transition:
                "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-width 0.3s, opacity 0.3s",
              transform: isHovered
                ? `translate(${EDGE_OUT[i].x}px, ${EDGE_OUT[i].y}px)`
                : "translate(0,0)",
              opacity: isHovered ? 1 : 0.35,
              transformOrigin: `${CX}px ${CY}px`,
            }}
          />
        ))}
        {isHovered && (
          <polygon
            points={VERTS.map(([x, y]) => {
              const dx = x - CX,
                dy = y - CY;
              return `${CX + dx * 1.2},${CY + dy * 1.2}`;
            }).join(" ")}
            fill="none"
            stroke={terpene.color}
            strokeWidth="0.8"
            opacity="0.2"
            strokeLinejoin="round"
            style={{ animation: "terp-pulse 1.5s ease-in-out infinite" }}
          />
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: isHovered
            ? "translate(-50%, -55%) scale(1.2)"
            : "translate(-50%, -55%)",
          transition: "transform 0.4s ease, opacity 0.3s",
          opacity: isHovered ? 1 : 0.6,
        }}
      >
        <TerpIcon
          type={terpene.icon}
          color={terpene.color}
          size={isHovered ? 46 : 40}
        />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: isHovered ? "0px" : "4px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          width: "160px",
          transition: "bottom 0.3s",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isHovered ? "11px" : "9px",
            fontWeight: isHovered ? 600 : 400,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: isHovered ? terpene.color : "#999",
            transition: "all 0.3s",
            whiteSpace: "nowrap",
          }}
        >
          {terpene.name}
        </div>
        {isHovered && (
          <div
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "8px",
              letterSpacing: "0.1em",
              color: terpene.color,
              opacity: 0.6,
              marginTop: "2px",
              animation: "terp-fade-in 0.3s ease forwards",
            }}
          >
            {terpene.aroma}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ CONVEYOR ROW ═══
function ConveyorRow({
  items,
  direction,
  speed,
  hoveredId,
  setHoveredId,
  setModalId,
}) {
  const [paused, setPaused] = useState(false);
  const stripW = items.length * ITEM_W;
  const tripled = [...items, ...items, ...items];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        setHoveredId(null);
      }}
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
        padding: "20px 0",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: `${HEX_GAP}px`,
          width: `${stripW * 3}px`,
          animation: `terp-scroll-${direction} ${speed}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {tripled.map((t, i) => (
          <TerpHex
            key={`${t.id}-${i}`}
            terpene={t}
            isHovered={hoveredId === t.id}
            isAnyHovered={hoveredId !== null}
            onHover={() => setHoveredId(t.id)}
            onLeave={() => {}}
            onClick={() => setModalId(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ═══ MAIN PAGE ═══
export default function TerpenePage() {
  const navigate = useNavigate();
  const { terpeneId } = useParams(); // /terpenes/:terpeneId

  const [hoveredId, setHoveredId] = useState(null);
  const [modalId, setModalId] = useState(null);

  // v3.1: If arriving via /terpenes/:id, auto-open that terpene's modal
  useEffect(() => {
    if (terpeneId) {
      const match = TERPENES.find((t) => t.id === terpeneId);
      if (match) {
        const timer = setTimeout(() => setModalId(terpeneId), 80);
        return () => clearTimeout(timer);
      }
    }
  }, [terpeneId]);

  const modalTerp = TERPENES.find((t) => t.id === modalId);

  const stripW_top = ROW_TOP.length * ITEM_W;
  const stripW_bot = ROW_BOT.length * ITEM_W;

  // Direct URL access — show modal immediately over a plain white background
  const urlTerp = TERPENES.find((t) => t.id === terpeneId);
  if (terpeneId && urlTerp) {
    return (
      <div style={{ minHeight: "100vh", background: "#faf9f6" }}>
        <TerpeneModal
          terpene={urlTerp}
          fromUrl={true}
          onClose={() => navigate(-1)}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        background: "#faf9f6",
        color: "#1a1a1a",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500;600&display=swap');
        @keyframes terp-scroll-right {
          0%   { transform: translateX(-${stripW_top}px); }
          100% { transform: translateX(0px); }
        }
        @keyframes terp-scroll-left {
          0%   { transform: translateX(0px); }
          100% { transform: translateX(-${stripW_bot}px); }
        }
        @keyframes terp-pulse {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.4; }
        }
        @keyframes terp-fade-in {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 0.6; transform: translateY(0); }
        }
      `}</style>

      {/* Hero */}
      <section
        style={{
          padding: "80px 24px 48px",
          textAlign: "center",
          background:
            "linear-gradient(160deg, #faf9f6 0%, #f0ebe1 40%, #e8f5ee 100%)",
        }}
      >
        <span
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#6b5b9e",
          }}
        >
          THE SCIENCE OF FLAVOUR
        </span>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 300,
            color: "#1a1a1a",
            margin: "12px 0 16px",
            lineHeight: 1.1,
          }}
        >
          Terpene Profiles
        </h1>
        <div
          style={{
            width: "48px",
            height: "2px",
            background: "#6b5b9e",
            margin: "0 auto 20px",
          }}
        />
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "15px",
            color: "#666",
            fontWeight: 300,
            maxWidth: "540px",
            margin: "0 auto",
            lineHeight: 1.7,
          }}
        >
          Terpenes are the aromatic architects of every cannabis experience.
          Hover to explore, click to discover the science.
        </p>
      </section>

      {/* Conveyor rows */}
      <section style={{ padding: "24px 0 16px" }}>
        <ConveyorRow
          items={ROW_TOP}
          direction="right"
          speed={SPEED_TOP}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          setModalId={setModalId}
        />
      </section>
      <section style={{ padding: "0 0 40px" }}>
        <ConveyorRow
          items={ROW_BOT}
          direction="left"
          speed={SPEED_BOT}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          setModalId={setModalId}
        />
      </section>

      {/* Back */}
      <section style={{ padding: "20px 24px 80px", textAlign: "center" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            fontFamily: "'Jost', sans-serif",
            padding: "12px 32px",
            background: "transparent",
            color: "#6b5b9e",
            border: "1px solid #6b5b9e",
            borderRadius: "2px",
            fontSize: "11px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: "pointer",
            fontWeight: 500,
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#6b5b9e";
            e.target.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "transparent";
            e.target.style.color = "#6b5b9e";
          }}
        >
          Back to Home
        </button>
      </section>

      {/* Modal — opened by hex click on this page, or auto-opened via /terpenes/:id */}
      {modalTerp && (
        <TerpeneModal
          terpene={modalTerp}
          fromUrl={!!terpeneId}
          onClose={() => {
            setModalId(null);
            if (terpeneId) navigate(-1);
          }}
        />
      )}
    </div>
  );
}
