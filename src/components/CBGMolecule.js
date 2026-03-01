// src/components/CBGMolecule.js v1.0
// Standalone CBG (Cannabigerol) animated molecule for embedding in any page.
// Geometry: Extracted from Adobe Illustrator SVG (filled polygon bonds).
// CBG has 1 ring (benzene with aromatic circle) + left geranyl chain + right pentyl chain.
// Effects: Additive polygon overlays (no dimming). 3 zones cycle randomly.
// Architecture matches Delta9THCMolecule.js v1.1 exactly.
import { useState, useEffect, useRef, useCallback } from "react";

// ═══ GEOMETRY — ILLUSTRATOR SVG SOURCE — DO NOT MODIFY ═══
// ViewBox: 0 0 334 156

// All bond polygons as path d-strings (filled shapes from Illustrator)
const BOND_PATHS = [
  // Ring bonds (6 sides of hexagon)
  "M128.526,82.1 L127.977,82.449 L127.427,82.1 L127.427,52.799 L127.977,52.449 L128.526,52.799Z",
  "M153.977,96.799 L153.977,98.1 L127.977,83.1 L127.977,82.449 L128.526,82.1Z",
  "M179.377,82.1 L179.927,82.449 L179.927,83.1 L153.977,98.1 L153.977,96.799Z",
  "M179.377,52.799 L180.477,52.099 L180.477,82.1 L179.927,82.449 L179.377,82.1Z",
  "M153.977,38.099 L153.977,37.449 L154.526,37.099 L180.477,52.099 L179.377,52.799Z",
  "M128.526,52.799 L127.977,52.449 L127.977,51.799 L153.376,37.099 L153.977,37.449 L153.977,38.099Z",
  // OH bond (ring top → OH label)
  "M153.376,15.949 L154.526,15.949 L154.526,37.099 L153.977,37.449 L153.376,37.099Z",
  // HO bond (ring lower-left → HO label)
  "M108.776,94.199 L108.177,93.199 L127.427,82.1 L127.977,82.449 L127.977,83.1Z",
  // Left chain: ring → first junction
  "M101.977,38.099 L101.977,36.799 L127.977,51.799 L127.977,52.449 L127.427,52.799Z",
  // Left chain continued
  "M76.026,53.099 L76.026,51.799 L101.977,36.799 L101.977,38.099Z",
  "M50.026,38.099 L50.026,37.449 L50.577,37.099 L76.026,51.799 L76.026,53.099Z",
  // Left chain double bond inner
  "M54.227,35.349 L54.827,34.349 L76.276,46.749 L75.727,47.749Z",
  // Left chain: junction → down
  "M24.626,52.799 L23.477,52.099 L49.477,37.099 L50.026,37.449 L50.026,38.099Z",
  // CH3 bond (top of left chain)
  "M49.477,15.949 L50.577,15.949 L50.577,37.099 L50.026,37.449 L49.477,37.099Z",
  // Left chain vertical down
  "M24.626,82.1 L23.477,82.799 L23.477,52.099 L24.626,52.799Z",
  // Left chain → lower junction
  "M50.577,97.1 L49.477,97.799 L23.477,82.799 L24.626,82.1Z",
  // Lower vertical
  "M50.577,127.1 L50.026,127.449 L49.477,127.1 L49.477,97.799 L50.577,97.1Z",
  // Lower double bond inner
  // rect x=44.977 y=100.049 w=1.1 h=24.801 (thin vertical line)
  // CH3 branch right
  "M70.177,138.449 L69.626,139.399 L50.026,128.1 L50.026,127.449 L50.577,127.1Z",
  // H3C branch left
  "M30.727,139.249 L30.126,138.249 L49.477,127.1 L50.026,127.449 L50.026,128.1Z",
  // Right chain from ring
  "M205.927,96.799 L205.927,98.1 L179.927,83.1 L179.927,82.449 L180.477,82.1Z",
  "M231.877,81.799 L231.877,83.1 L205.927,98.1 L205.927,96.799Z",
  "M257.877,96.799 L257.877,98.1 L231.877,83.1 L231.877,81.799Z",
  "M283.877,81.799 L283.877,83.1 L257.877,98.1 L257.877,96.799Z",
  // CH3 end cap
  "M304.026,93.449 L303.477,94.449 L283.877,83.1 L283.877,81.799Z",
];

// Aromatic circle (benzene indicator)
const AROMATIC_CIRCLE = { cx: 153.9, cy: 67.4, r: 21.15 };

// Double bond inner line (lower chain)
const DBL_RECT = { x: 44.977, y: 100.049, w: 1.1, h: 24.801 };

// Ring zone polygon
const RING =
  "154.0,37.4 180.5,52.1 179.9,82.4 154.0,98.1 128.0,82.4 128.0,52.4";
const ZONE_NAMES = ["Ring", "Left Chain", "Right Chain"];

const TIERS = {
  light: { opacity: 0.22 },
  medium: { opacity: 0.38 },
  dark: { opacity: 0.55 },
  solid: { opacity: 0.78 },
};

function lighten(hex, amt) {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return `#${[r, g, b]
    .map((c) =>
      Math.min(255, Math.round(c + (255 - c) * amt))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

// ═══ GEOMETRY RENDERER ═══
function Geo({ color }) {
  return (
    <g>
      {BOND_PATHS.map((d, i) => (
        <path key={i} d={d} fill={color} stroke="none" />
      ))}
      {/* Aromatic circle */}
      <circle
        cx={AROMATIC_CIRCLE.cx}
        cy={AROMATIC_CIRCLE.cy}
        r={AROMATIC_CIRCLE.r}
        fill="none"
        stroke={color}
        strokeWidth="1.15"
      />
      {/* Double bond inner line */}
      <rect
        x={DBL_RECT.x}
        y={DBL_RECT.y}
        width={DBL_RECT.w}
        height={DBL_RECT.h}
        fill={color}
      />
    </g>
  );
}

// ═══ TEXT LABELS ═══
function AtomLabels({ color }) {
  return (
    <g fill={color} fontWeight="bold">
      {/* OH (ring top) */}
      <text x="147.7" y="13.7" fontFamily="Helvetica, Arial" fontSize="16">
        OH
      </text>
      {/* HO (ring lower-left) */}
      <text x="84.2" y="103.7" fontFamily="Helvetica, Arial" fontSize="16">
        HO
      </text>
      {/* CH3 (top of left chain) */}
      <text x="44.3" y="13.7" fontFamily="Helvetica, Arial" fontSize="16">
        CH
      </text>
      <text x="67.4" y="16.7" fontFamily="Helvetica, Arial" fontSize="12">
        3
      </text>
      {/* CH3 (lower-right branch) */}
      <text x="70.3" y="148.7" fontFamily="Helvetica, Arial" fontSize="16">
        CH
      </text>
      <text x="93.4" y="151.7" fontFamily="Helvetica, Arial" fontSize="12">
        3
      </text>
      {/* H3C (lower-left branch) */}
      <text x="0" y="148.7" fontFamily="Helvetica, Arial" fontSize="16">
        H
      </text>
      <text x="11.6" y="151.7" fontFamily="Helvetica, Arial" fontSize="12">
        3
      </text>
      <text x="18.2" y="148.7" fontFamily="Helvetica, Arial" fontSize="16">
        C
      </text>
      {/* CH3 (end of right chain) */}
      <text x="304.1" y="103.7" fontFamily="Helvetica, Arial" fontSize="16">
        CH
      </text>
      <text x="327.2" y="106.7" fontFamily="Helvetica, Arial" fontSize="12">
        3
      </text>
    </g>
  );
}

// ═══ ANIMATED MOLECULE RENDERER ═══
function MoleculeRenderer({ color, opacity, animate }) {
  const [zone, setZone] = useState(null);
  const [sweep, setSweep] = useState(0);
  const timers = useRef([]);
  const raf = useRef(null);
  const alive = useRef(true);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  const doSweep = useCallback((dir, done) => {
    const dur = 1800,
      t0 = performance.now();
    const tick = (now) => {
      if (!alive.current) return;
      const p = Math.min((now - t0) / dur, 1);
      setSweep(1 - Math.pow(1 - p, 3));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else done?.();
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!animate) {
      setZone(null);
      setSweep(0);
      return;
    }
    const rm =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (rm) return;
    let last = -1;
    const go = () => {
      if (!alive.current) return;
      let n;
      do {
        n = Math.floor(Math.random() * 3);
      } while (n === last);
      last = n;
      setZone(n);
      setSweep(0);
      if (n >= 1) {
        doSweep(n, () => {
          const t1 = setTimeout(() => {
            if (!alive.current) return;
            setZone(null);
            setSweep(0);
            const t2 = setTimeout(go, 800 + Math.random() * 1000);
            timers.current.push(t2);
          }, 600);
          timers.current.push(t1);
        });
      } else {
        const t1 = setTimeout(
          () => {
            if (!alive.current) return;
            setZone(null);
            const t2 = setTimeout(go, 800 + Math.random() * 1000);
            timers.current.push(t2);
          },
          1500 + Math.random() * 500,
        );
        timers.current.push(t1);
      }
    };
    const t0 = setTimeout(go, 400);
    timers.current.push(t0);
    return () => {
      alive.current = false;
      clear();
    };
  }, [animate, doSweep, clear]);

  const bright = lighten(color, 0.45);

  return (
    <svg viewBox="0 0 334 156" width="100%" style={{ display: "block" }}>
      <defs>
        <filter id="cbg-glo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Left chain sweep clip */}
        <clipPath id="cbg-lc">
          <rect
            x={128 - 128 * (zone === 1 ? sweep : 0)}
            y="0"
            width={128 * (zone === 1 ? sweep : 0)}
            height="156"
          />
        </clipPath>
        {/* Right chain sweep clip */}
        <clipPath id="cbg-rc">
          <rect
            x="180"
            y="0"
            width={154 * (zone === 2 ? sweep : 0)}
            height="156"
          />
        </clipPath>
      </defs>

      {/* Base molecule */}
      <g opacity={opacity}>
        <Geo color={color} />
        <AtomLabels color={color} />
      </g>

      {/* Ring glow overlay */}
      {zone === 0 && (
        <polygon
          points={RING}
          fill="none"
          stroke={bright}
          strokeWidth="1.2"
          strokeLinejoin="round"
          filter="url(#cbg-glo)"
          opacity="0.95"
        />
      )}

      {/* Left chain sweep */}
      {zone === 1 && sweep > 0 && (
        <g clipPath="url(#cbg-lc)" opacity={0.9 * sweep} filter="url(#cbg-glo)">
          <Geo color={bright} />
          <AtomLabels color={bright} />
        </g>
      )}

      {/* Right chain sweep */}
      {zone === 2 && sweep > 0 && (
        <g clipPath="url(#cbg-rc)" opacity={0.9 * sweep} filter="url(#cbg-glo)">
          <Geo color={bright} />
          <AtomLabels color={bright} />
        </g>
      )}
    </svg>
  );
}

// ═══ EXPORTED COMPONENT ═══
export default function CBGMolecule({
  onClick,
  showControls = true,
  compact = false,
}) {
  const [tier, setTier] = useState("dark");
  const [color, setColor] = useState("#8B5CF6");
  const [hovered, setHovered] = useState(false);

  const colors = [
    { hex: "#8B5CF6", name: "Purple" },
    { hex: "#52b788", name: "Green" },
    { hex: "#3B82F6", name: "Blue" },
    { hex: "#EF4444", name: "Red" },
    { hex: "#EAB308", name: "Gold" },
    { hex: "#14B8A6", name: "Teal" },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: onClick ? "pointer" : "default",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          transform: onClick && hovered ? "translateY(-4px)" : "none",
          borderRadius: "4px",
          position: "relative",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: compact ? "8px" : "12px",
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: compact ? "14px" : "15px",
              fontWeight: 300,
              color: "#1a1a1a",
              letterSpacing: "0.06em",
            }}
          >
            Cannabigerol
          </div>
          <div
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#aaa",
              marginTop: "2px",
            }}
          >
            Living Molecule
          </div>
        </div>

        <MoleculeRenderer
          color={color}
          opacity={TIERS[tier].opacity}
          animate={true}
        />

        {onClick && hovered && (
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "'Jost', sans-serif",
              fontSize: "9px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#6d28d9",
              opacity: 0.7,
              whiteSpace: "nowrap",
              background: "rgba(250,249,246,0.85)",
              padding: "2px 10px",
              borderRadius: "2px",
            }}
          >
            Explore All Molecules →
          </div>
        )}
      </div>

      {showControls && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            {Object.keys(TIERS).map((k) => (
              <button
                key={k}
                onClick={(e) => {
                  e.stopPropagation();
                  setTier(k);
                }}
                style={{
                  padding: "4px 10px",
                  fontSize: "9px",
                  fontFamily: "'Jost', sans-serif",
                  fontWeight: tier === k ? 600 : 400,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  border: `1px solid ${tier === k ? color : "#e8e0d4"}`,
                  borderRadius: "2px",
                  background: tier === k ? color : "transparent",
                  color: tier === k ? "#fff" : "#888",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <div
            style={{ width: "1px", height: "16px", background: "#e8e0d4" }}
          />
          <div style={{ display: "flex", gap: "4px" }}>
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={(e) => {
                  e.stopPropagation();
                  setColor(c.hex);
                }}
                title={c.name}
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "2px",
                  border:
                    color === c.hex
                      ? `2px solid ${c.hex}`
                      : "1px solid #e8e0d4",
                  background: c.hex,
                  cursor: "pointer",
                  padding: 0,
                  boxShadow: color === c.hex ? `0 0 6px ${c.hex}44` : "none",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
