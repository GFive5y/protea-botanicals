// src/components/TerpeneCarousel.js v1.3
// v1.3: REMOVE useNavigate. ADD onSelect prop — onClick calls onSelect(t.id)
//       instead of navigating to /terpenes/:id. Landing.js lifts the state
//       and renders TerpeneModal in-place (DEC-024).
// v1.2: onClick navigated directly to /terpenes/:id (ABANDONED — DEC-024).
// v1.1: 800px wide, 32px gap, no border, 1.15× hover scale.
// Two-row conveyor: top drifts right, bottom drifts left.
import { useState } from "react";

const TERPENES = [
  {
    id: "myrcene",
    name: "Myrcene",
    color: "#2d6a4f",
    aroma: "Earthy · Musky",
    icon: "leaf",
  },
  {
    id: "limonene",
    name: "Limonene",
    color: "#EAB308",
    aroma: "Citrus · Lemon",
    icon: "citrus",
  },
  {
    id: "pinene",
    name: "Pinene",
    color: "#166534",
    aroma: "Pine · Fresh",
    icon: "pine",
  },
  {
    id: "linalool",
    name: "Linalool",
    color: "#9b6b9e",
    aroma: "Floral · Lavender",
    icon: "flower",
  },
  {
    id: "caryophyllene",
    name: "Caryophyllene",
    color: "#c0764a",
    aroma: "Spicy · Pepper",
    icon: "spice",
  },
  {
    id: "terpinolene",
    name: "Terpinolene",
    color: "#5a9e7c",
    aroma: "Floral · Piney",
    icon: "herb",
  },
  {
    id: "humulene",
    name: "Humulene",
    color: "#8B6914",
    aroma: "Earthy · Hoppy",
    icon: "hop",
  },
  {
    id: "ocimene",
    name: "Ocimene",
    color: "#2563EB",
    aroma: "Sweet · Herbal",
    icon: "wave",
  },
  {
    id: "bisabolol",
    name: "Bisabolol",
    color: "#EC4899",
    aroma: "Floral · Sweet",
    icon: "drop",
  },
  {
    id: "geraniol",
    name: "Geraniol",
    color: "#E11D48",
    aroma: "Rose · Citrus",
    icon: "rose",
  },
  {
    id: "eucalyptol",
    name: "Eucalyptol",
    color: "#0891B2",
    aroma: "Minty · Cool",
    icon: "crystal",
  },
  {
    id: "nerolidol",
    name: "Nerolidol",
    color: "#7C3AED",
    aroma: "Woody · Floral",
    icon: "spiral",
  },
];

const ROW_TOP = TERPENES.slice(0, 6);
const ROW_BOT = TERPENES.slice(6, 12);

const HEX_S = 90;
const HEX_GAP = 32;
const ITEM_W = HEX_S + HEX_GAP;
const TRACK_W = 800;
const SPEED_TOP = 28;
const SPEED_BOT = 32;

// ═══ ICON RENDERER ═══
function TerpIcon({ type, color, size = 28 }) {
  const s = size,
    c = s / 2,
    sw = 1.4;
  const icons = {
    leaf: (
      <g>
        <path
          d={`M${c},${s * 0.12} C${s * 0.18},${s * 0.35} ${s * 0.13},${s * 0.65} ${c},${s * 0.88}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M${c},${s * 0.12} C${s * 0.82},${s * 0.35} ${s * 0.87},${s * 0.65} ${c},${s * 0.88}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <line
          x1={c}
          y1={s * 0.3}
          x2={c}
          y2={s * 0.85}
          stroke={color}
          strokeWidth={sw * 0.6}
          strokeLinecap="round"
        />
      </g>
    ),
    citrus: (
      <g>
        <circle
          cx={c}
          cy={c}
          r={s * 0.35}
          fill="none"
          stroke={color}
          strokeWidth={sw}
        />
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={c + Math.cos(r) * s * 0.14}
              y1={c + Math.sin(r) * s * 0.14}
              x2={c + Math.cos(r) * s * 0.33}
              y2={c + Math.sin(r) * s * 0.33}
              stroke={color}
              strokeWidth={sw * 0.5}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    ),
    pine: (
      <g>
        <polygon
          points={`${c},${s * 0.1} ${s * 0.3},${s * 0.4} ${s * 0.7},${s * 0.4}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <polygon
          points={`${c},${s * 0.3} ${s * 0.2},${s * 0.62} ${s * 0.8},${s * 0.62}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <line
          x1={c}
          y1={s * 0.62}
          x2={c}
          y2={s * 0.92}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </g>
    ),
    flower: (
      <g>
        {[0, 72, 144, 216, 288].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <circle
              key={a}
              cx={c + Math.cos(r) * s * 0.2}
              cy={c + Math.sin(r) * s * 0.2}
              r={s * 0.12}
              fill="none"
              stroke={color}
              strokeWidth={sw * 0.7}
            />
          );
        })}
        <circle cx={c} cy={c} r={s * 0.07} fill={color} opacity="0.25" />
      </g>
    ),
    spice: (
      <g>
        <circle
          cx={c}
          cy={c}
          r={s * 0.12}
          fill="none"
          stroke={color}
          strokeWidth={sw}
        />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={c + Math.cos(r) * s * 0.16}
              y1={c + Math.sin(r) * s * 0.16}
              x2={c + Math.cos(r) * s * 0.38}
              y2={c + Math.sin(r) * s * 0.38}
              stroke={color}
              strokeWidth={sw * 0.5}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    ),
    herb: (
      <g>
        <line
          x1={c}
          y1={s * 0.85}
          x2={c}
          y2={s * 0.22}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M${c},${s * 0.55} C${s * 0.28},${s * 0.45} ${s * 0.22},${s * 0.25} ${s * 0.34},${s * 0.18}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.7}
          strokeLinecap="round"
        />
        <path
          d={`M${c},${s * 0.42} C${s * 0.72},${s * 0.32} ${s * 0.78},${s * 0.15} ${s * 0.66},${s * 0.1}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.7}
          strokeLinecap="round"
        />
      </g>
    ),
    hop: (
      <g>
        <circle
          cx={c}
          cy={c}
          r={s * 0.28}
          fill="none"
          stroke={color}
          strokeWidth={sw}
        />
        <ellipse
          cx={c}
          cy={c - s * 0.08}
          rx={s * 0.11}
          ry={s * 0.17}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.6}
          transform={`rotate(-15 ${c} ${c})`}
        />
        <ellipse
          cx={c + s * 0.07}
          cy={c + s * 0.07}
          rx={s * 0.11}
          ry={s * 0.17}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.6}
          transform={`rotate(45 ${c} ${c})`}
        />
      </g>
    ),
    wave: (
      <g>
        <path
          d={`M${s * 0.12},${s * 0.33} C${s * 0.28},${s * 0.18} ${s * 0.42},${s * 0.5}  ${s * 0.58},${s * 0.33} C${s * 0.74},${s * 0.18} ${s * 0.88},${s * 0.38} ${s * 0.88},${s * 0.38}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <path
          d={`M${s * 0.12},${s * 0.55} C${s * 0.28},${s * 0.4}  ${s * 0.42},${s * 0.72} ${s * 0.58},${s * 0.55} C${s * 0.74},${s * 0.4}  ${s * 0.88},${s * 0.6}  ${s * 0.88},${s * 0.6}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </g>
    ),
    drop: (
      <g>
        <path
          d={`M${c},${s * 0.12} C${c},${s * 0.12} ${s * 0.24},${s * 0.48} ${s * 0.24},${s * 0.58} C${s * 0.24},${s * 0.78} ${s * 0.36},${s * 0.88} ${c},${s * 0.88} C${s * 0.64},${s * 0.88} ${s * 0.76},${s * 0.78} ${s * 0.76},${s * 0.58} C${s * 0.76},${s * 0.48} ${c},${s * 0.12} ${c},${s * 0.12} Z`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </g>
    ),
    rose: (
      <g>
        <circle
          cx={c}
          cy={c * 0.85}
          r={s * 0.1}
          fill="none"
          stroke={color}
          strokeWidth={sw}
        />
        <path
          d={`M${c - s * 0.1},${c * 0.85} C${c - s * 0.28},${c * 0.68} ${c - s * 0.28},${c * 0.45} ${c},${c * 0.35}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.7}
          strokeLinecap="round"
        />
        <path
          d={`M${c + s * 0.1},${c * 0.85} C${c + s * 0.28},${c * 0.68} ${c + s * 0.28},${c * 0.45} ${c},${c * 0.35}`}
          fill="none"
          stroke={color}
          strokeWidth={sw * 0.7}
          strokeLinecap="round"
        />
        <line
          x1={c}
          y1={c * 0.85 + s * 0.1}
          x2={c}
          y2={s * 0.92}
          stroke={color}
          strokeWidth={sw * 0.6}
          strokeLinecap="round"
        />
      </g>
    ),
    crystal: (
      <g>
        <polygon
          points={`${c},${s * 0.08} ${s * 0.74},${s * 0.28} ${s * 0.74},${s * 0.72} ${c},${s * 0.92} ${s * 0.26},${s * 0.72} ${s * 0.26},${s * 0.28}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <line
          x1={c}
          y1={s * 0.08}
          x2={c}
          y2={s * 0.92}
          stroke={color}
          strokeWidth={sw * 0.4}
          opacity="0.3"
        />
      </g>
    ),
    spiral: (
      <g>
        <path
          d={`M${c},${c} C${c + s * 0.05},${c - s * 0.08} ${c + s * 0.14},${c - s * 0.06} ${c + s * 0.14},${c} C${c + s * 0.14},${c + s * 0.1} ${c + s * 0.05},${c + s * 0.17} ${c - s * 0.05},${c + s * 0.17} C${c - s * 0.18},${c + s * 0.17} ${c - s * 0.26},${c + s * 0.06} ${c - s * 0.26},${c - s * 0.06} C${c - s * 0.26},${c - s * 0.2} ${c - s * 0.12},${c - s * 0.3} ${c + s * 0.06},${c - s * 0.3}`}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </g>
    ),
  };
  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      style={{ overflow: "visible" }}
    >
      {icons[type] || icons.leaf}
    </svg>
  );
}

// ═══ HEX SVG ═══
const HR = 38;
const HCX = 45,
  HCY = 50;
const sin60 = Math.sin(Math.PI / 3);
const cos60 = Math.cos(Math.PI / 3);
const VERTS = [
  [HCX, HCY - HR],
  [HCX + HR * sin60, HCY - HR * cos60],
  [HCX + HR * sin60, HCY + HR * cos60],
  [HCX, HCY + HR],
  [HCX - HR * sin60, HCY + HR * cos60],
  [HCX - HR * sin60, HCY - HR * cos60],
];
const hexPts = VERTS.map((v) => `${v[0]},${v[1]}`).join(" ");
function edgePath(i) {
  const a = VERTS[i],
    b = VERTS[(i + 1) % 6];
  return `M${a[0]},${a[1]} L${b[0]},${b[1]}`;
}
const EDGE_OUT = [
  { x: 3, y: -5 },
  { x: 5, y: 0 },
  { x: 3, y: 5 },
  { x: -3, y: 5 },
  { x: -5, y: 0 },
  { x: -3, y: -5 },
];

// ═══ HEX CARD ═══
function MiniHex({ terp, isHovered, isAnyHovered, onHover, onLeave, onClick }) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        width: `${HEX_S}px`,
        height: `${HEX_S + 16}px`,
        cursor: "pointer",
        position: "relative",
        transition:
          "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s",
        transform: isHovered
          ? "scale(1.15)"
          : isAnyHovered
            ? "scale(0.96)"
            : "scale(1)",
        zIndex: isHovered ? 100 : 1,
        filter:
          isAnyHovered && !isHovered
            ? "brightness(0.85) saturate(0.6)"
            : "none",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 90 100"
        width={HEX_S}
        height={HEX_S + 10}
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter
            id={`tc-${terp.id}`}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <polygon
          points={hexPts}
          fill={isHovered ? `${terp.color}12` : "#fff"}
          stroke="none"
          style={{ transition: "fill 0.3s" }}
        />

        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={edgePath(i)}
            fill="none"
            stroke={terp.color}
            strokeWidth={isHovered ? "1.8" : "1"}
            strokeLinecap="round"
            filter={isHovered ? `url(#tc-${terp.id})` : "none"}
            style={{
              transition:
                "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-width 0.3s, opacity 0.3s",
              transform: isHovered
                ? `translate(${EDGE_OUT[i].x}px, ${EDGE_OUT[i].y}px)`
                : "translate(0,0)",
              opacity: isHovered ? 1 : 0.35,
              transformOrigin: `${HCX}px ${HCY}px`,
            }}
          />
        ))}

        {isHovered && (
          <polygon
            points={VERTS.map(([x, y]) => {
              const dx = x - HCX,
                dy = y - HCY;
              return `${HCX + dx * 1.1},${HCY + dy * 1.1}`;
            }).join(" ")}
            fill="none"
            stroke={terp.color}
            strokeWidth="0.5"
            opacity="0.2"
            strokeLinejoin="round"
            style={{ animation: "tc-pulse 1.5s ease-in-out infinite" }}
          />
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          top: "44%",
          left: "50%",
          transform: isHovered
            ? "translate(-50%, -50%) scale(1.05)"
            : "translate(-50%, -50%)",
          transition: "transform 0.35s, opacity 0.3s",
          opacity: isHovered ? 1 : 0.55,
        }}
      >
        <TerpIcon
          type={terp.icon}
          color={terp.color}
          size={isHovered ? 30 : 26}
        />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: isHovered ? "1px" : "4px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          width: "110px",
          transition: "bottom 0.3s",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: isHovered ? "9px" : "8px",
            fontWeight: isHovered ? 600 : 400,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: isHovered ? terp.color : "#999",
            transition: "all 0.3s",
            whiteSpace: "nowrap",
          }}
        >
          {terp.name}
        </div>
        {isHovered && (
          <div
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "7px",
              letterSpacing: "0.08em",
              color: terp.color,
              opacity: 0.6,
              marginTop: "1px",
              animation: "tc-fade 0.25s ease forwards",
            }}
          >
            {terp.aroma}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ CONVEYOR ROW ═══
// v1.3: accepts onSelect prop — no navigate()
function ConveyorRow({
  items,
  direction,
  speed,
  hoveredId,
  setHoveredId,
  onSelect,
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
        padding: "18px 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: `${HEX_GAP}px`,
          animation: `tc-scroll-${direction} ${speed}s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {tripled.map((t, i) => (
          <MiniHex
            key={`${t.id}-${i}`}
            terp={t}
            isHovered={hoveredId === t.id}
            isAnyHovered={hoveredId !== null}
            onHover={() => setHoveredId(t.id)}
            onLeave={() => {}}
            // v1.3: call onSelect callback — no route navigation
            onClick={() => onSelect(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ═══ MAIN EXPORT ═══
// v1.3: accepts onSelect(terpeneId) prop from parent (Landing.js)
export default function TerpeneCarousel({ onSelect }) {
  const [hoveredId, setHoveredId] = useState(null);

  const stripW_top = ROW_TOP.length * ITEM_W;
  const stripW_bot = ROW_BOT.length * ITEM_W;

  return (
    <div
      style={{
        maxWidth: `${TRACK_W}px`,
        margin: "0 auto",
        padding: "20px 0 16px",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes tc-scroll-right {
          0%   { transform: translateX(-${stripW_top}px); }
          100% { transform: translateX(0px); }
        }
        @keyframes tc-scroll-left {
          0%   { transform: translateX(0px); }
          100% { transform: translateX(-${stripW_bot}px); }
        }
        @keyframes tc-pulse {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.35; }
        }
        @keyframes tc-fade {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 0.6; transform: translateY(0); }
        }
      `}</style>

      <ConveyorRow
        items={ROW_TOP}
        direction="right"
        speed={SPEED_TOP}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
        onSelect={onSelect}
      />

      <div style={{ height: "0px" }} />

      <ConveyorRow
        items={ROW_BOT}
        direction="left"
        speed={SPEED_BOT}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
        onSelect={onSelect}
      />
    </div>
  );
}
