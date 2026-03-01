// src/components/Delta10THCMolecule.js v1.0
// Standalone Delta-10-THC animated molecule for embedding in any page.
// Geometry: Extracted from ChemDraw SVG source (32 filled bond paths).
// Effects: Additive polygon overlays (no dimming). 4 zones cycle randomly.
// Architecture matches Delta9THCMolecule.js v1.1 exactly.
import { useState, useEffect, useRef, useCallback } from "react";

// ═══ GEOMETRY — CHEMDRAW SOURCE — DO NOT MODIFY ═══
// Original SVG: viewBox="0 0 132 75"
// Transform: matrix(0.05 0 0 0.05 -264 -159)

const BOND_PATHS = [
  "M 7614.27,4343.07 L 7613.98,4329.19 L 7869.35,4469.62 L 7863.56,4480.17 L 7614.27,4343.07 Z",
  "M 7367.93,4492.22 L 7367.64,4478.33 L 7613.98,4329.19 L 7614.27,4343.07 L 7367.93,4492.22 Z",
  "M 7115.6,4353.45 L 7115.31,4339.56 L 7367.64,4478.33 L 7367.93,4492.22 L 7115.6,4353.45 Z",
  "M 6869.26,4502.6 L 6868.97,4488.71 L 7115.31,4339.56 L 7115.6,4353.45 L 6869.26,4502.6 Z",
  "M 6616.93,4363.83 L 6616.79,4356.89 L 6622.73,4353.29 L 6868.97,4488.71 L 6869.26,4502.6 L 6616.93,4363.83 Z",
  "M 6370.59,4512.97 L 6370.31,4499.08 L 6610.7,4353.54 L 6616.79,4356.89 L 6616.93,4363.83 L 6370.59,4512.97 Z",
  "M 6372.32,4451.34 L 6366.09,4441.04 L 6561.23,4322.9 L 6567.46,4333.19 L 6372.32,4451.34 Z",
  "M 6118.26,4374.21 L 6118.12,4367.27 L 6124.06,4363.67 L 6370.31,4499.08 L 6370.59,4512.97 L 6118.26,4374.21 Z",
  "M 6106.19,4082.96 L 6112.13,4079.36 L 6118.21,4082.71 L 6124.06,4363.67 L 6118.12,4367.27 L 6112.03,4363.92 L 6106.19,4082.96 Z",
  "M 6158.56,4108.33 L 6170.59,4108.08 L 6175.33,4336.14 L 6163.31,4336.39 L 6158.56,4108.33 Z",
  "M 5859.94,3947.54 L 5859.8,3940.6 L 5865.74,3937 L 6111.98,4072.41 L 6112.13,4079.36 L 6106.19,4082.96 L 5859.94,3947.54 Z",
  "M 5847.86,3656.29 L 5859.75,3649.09 L 5865.74,3937 L 5859.8,3940.6 L 5853.71,3937.25 L 5847.86,3656.29 Z",
  "M 5796.59,3683.81 L 5808.62,3683.56 L 5813.37,3911.63 L 5801.34,3911.88 L 5796.59,3683.81 Z",
  "M 5601.62,3520.87 L 5601.47,3513.93 L 5607.42,3510.33 L 5859.75,3649.09 L 5847.86,3656.29 L 5601.62,3520.87 Z",
  "M 5361.22,3666.41 L 5349.05,3659.72 L 5595.39,3510.58 L 5601.47,3513.93 L 5601.62,3520.87 L 5361.22,3666.41 Z",
  "M 5367.07,3947.38 L 5355.19,3954.57 L 5349.05,3659.72 L 5361.22,3666.41 L 5367.07,3947.38 Z",
  "M 5613.31,4082.79 L 5613.6,4096.68 L 5355.19,3954.57 L 5367.07,3947.38 L 5613.31,4082.79 Z",
  "M 5613.6,4096.68 L 5613.31,4082.79 L 5853.71,3937.25 L 5859.8,3940.6 L 5859.94,3947.54 L 5613.6,4096.68 Z",
  "M 5648.4,4326.86 L 5588.41,4328.11 L 5589.7,4316.05 L 5646.61,4314.87 L 5648.4,4326.86 Z",
  "M 5639.7,4268.5 L 5594.68,4269.43 L 5595.96,4257.37 L 5637.91,4256.5 L 5639.7,4268.5 Z",
  "M 5631,4210.13 L 5600.94,4210.76 L 5602.23,4198.7 L 5629.22,4198.14 L 5631,4210.13 Z",
  "M 5622.31,4151.77 L 5607.2,4152.08 L 5608.49,4140.02 L 5620.52,4139.77 L 5622.31,4151.77 Z",
  "M 5783.36,4460.92 L 5777.56,4471.46 L 5621.82,4385.81 L 5619.45,4377.64 L 5620.94,4371.6 L 5783.36,4460.92 Z",
  "M 5963.51,4467.91 L 5957.28,4457.61 L 6112.03,4363.92 L 6118.12,4367.27 L 6118.26,4374.21 L 5963.51,4467.91 Z",
  "M 5485.96,4632.87 L 5475.42,4627.08 L 5609.16,4383.88 L 5619.45,4377.64 L 5621.82,4385.81 L 5485.96,4632.87 Z",
  "M 5331.67,4389.65 L 5331.42,4377.62 L 5620.94,4371.6 L 5619.45,4377.64 L 5609.16,4383.88 L 5331.67,4389.65 Z",
  "M 5589.47,3226.14 L 5601.5,3225.89 L 5607.42,3510.33 L 5601.47,3513.93 L 5595.39,3510.58 L 5589.47,3226.14 Z",
  "M 6352.38,3926.87 L 6358.47,3930.22 L 6358.61,3937.16 L 6118.21,4082.71 L 6112.13,4079.36 L 6111.98,4072.41 L 6352.38,3926.87 Z",
  "M 6616.74,4065.38 L 6604.85,4072.58 L 6358.61,3937.16 L 6358.47,3930.22 L 6364.41,3926.62 L 6616.74,4065.38 Z",
  "M 6562.49,4094.71 L 6556.7,4105.25 L 6356.81,3995.33 L 6362.61,3984.79 L 6562.49,4094.71 Z",
  "M 6604.85,4072.58 L 6616.74,4065.38 L 6622.73,4353.29 L 6616.79,4356.89 L 6610.7,4353.54 L 6604.85,4072.58 Z",
  "M 6348.69,3749.58 L 6360.72,3749.33 L 6364.41,3926.62 L 6358.47,3930.22 L 6352.38,3926.87 L 6348.69,3749.58 Z",
];

// ChemDraw matrix transform (maps source coords → viewBox coords)
const GEO_TRANSFORM = "matrix(0.05 0 0 0.05 -264 -159)";

// Ring zone polygons (in viewBox coordinates 0 0 132 75)
// Ring A: Cyclohexane (left) — atoms [13,14,17,18,19,20]
const RING_A = "29.0,38.1 28.6,23.7 16.1,16.7 3.8,24.2 4.1,38.5 16.7,45.5";
// Ring B: Pyran (center) — bridges Ring A → Ring C through O atom
const RING_B = "41.6,45.0 29.0,38.1 16.7,45.5 17.0,59.9 29.6,66.9 41.9,59.4";
// Ring C: Cyclohexene (right) — atoms [5,6,9,10,34,35]
const RING_C = "66.8,58.9 54.5,66.4 41.9,59.4 41.6,45.0 53.9,37.5 66.5,44.4";
const RING_PATHS = [RING_A, RING_B, RING_C];
const ZONE_NAMES = ["Ring A", "Ring B", "Ring C", "Chain"];

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
function Geo({ color, stroke = "none", sw = 0 }) {
  return (
    <g transform={GEO_TRANSFORM}>
      {BOND_PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={color}
          stroke={stroke}
          strokeWidth={sw / 0.05}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

// ═══ TEXT LABELS (O and OH from ChemDraw) ═══
function AtomLabels({ color }) {
  return (
    <g
      fill={color}
      fontFamily="Arial"
      fontSize="10"
      fontWeight="normal"
      fontStyle="normal"
    >
      <text x="28.5" y="71.5">
        O
      </text>
      <text x="51.5" y="28.5">
        OH
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

  const doSweep = useCallback((done) => {
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
        n = Math.floor(Math.random() * 4);
      } while (n === last);
      last = n;
      setZone(n);
      setSweep(0);
      if (n === 3) {
        // Chain sweep animation
        doSweep(() => {
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
        // Ring pulse animation
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
    <svg viewBox="0 0 132 75" width="100%" style={{ display: "block" }}>
      <defs>
        <filter id="d10-glo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Chain sweep clip — right side from Ring C outward */}
        <clipPath id="d10-cc">
          <rect
            x="66"
            y="0"
            width={66 * (zone === 3 ? sweep : 0)}
            height="75"
          />
        </clipPath>
      </defs>

      {/* Base molecule */}
      <g opacity={opacity}>
        <Geo color={color} />
        <AtomLabels color={color} />
      </g>

      {/* Ring glow overlay */}
      {zone !== null && zone < 3 && (
        <polygon
          points={RING_PATHS[zone]}
          fill="none"
          stroke={bright}
          strokeWidth="0.8"
          strokeLinejoin="round"
          filter="url(#d10-glo)"
          opacity="0.95"
        />
      )}

      {/* Chain sweep overlay */}
      {zone === 3 && sweep > 0 && (
        <g clipPath="url(#d10-cc)" opacity={0.9 * sweep} filter="url(#d10-glo)">
          <Geo color={bright} stroke={bright} sw={0.5} />
          <AtomLabels color={bright} />
        </g>
      )}
    </svg>
  );
}

// ═══ EXPORTED COMPONENT ═══
// Props: onClick (optional), showControls (default true), compact (default false)
export default function Delta10THCMolecule({
  onClick,
  showControls = true,
  compact = false,
}) {
  const [tier, setTier] = useState("dark");
  const [color, setColor] = useState("#EF4444");
  const [hovered, setHovered] = useState(false);

  const colors = [
    { hex: "#EF4444", name: "Red" },
    { hex: "#52b788", name: "Green" },
    { hex: "#3B82F6", name: "Blue" },
    { hex: "#EAB308", name: "Gold" },
    { hex: "#8B5CF6", name: "Purple" },
    { hex: "#14B8A6", name: "Teal" },
  ];

  return (
    <div style={{ width: "100%" }}>
      {/* Clickable molecule area */}
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
        {/* Title */}
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
            Δ10-Tetrahydrocannabinol
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

        {/* SVG */}
        <MoleculeRenderer
          color={color}
          opacity={TIERS[tier].opacity}
          animate={true}
        />

        {/* Hover hint */}
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
              color: "#b91c1c",
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

      {/* Controls */}
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
