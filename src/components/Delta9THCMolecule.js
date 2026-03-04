// src/components/Delta9THCMolecule.js v1.1
// v1.1: Added onClick prop for clickable behavior. Hover cursor + subtle lift.
// v1.0: Standalone Delta-9-THC animated molecule for embedding in any page.
// Geometry: Pixel-perfect from Adobe Illustrator SVG source.
// Effects: Additive polygon overlays (no dimming). 4 zones cycle randomly.
import { useState, useEffect, useRef, useCallback } from "react";

// ═══ GEOMETRY — EXACT SOURCE — DO NOT MODIFY ═══

const MOLECULE_PATH =
  "M160.257,292.275c-2.75-0.899-5.109-3.008-6.475-5.789c-0.51-1.039-1.447-3.586-1.469-6.201 c-0.024-2.86,0.913-5.804,1.474-6.946c2.599-5.293,7.992-7.517,13.932-5.744c4.577,1.365,7.396,5.366,7.831,11.114 c0.603,7.967-3.701,13.567-10.756,13.995C163.197,292.801,161.323,292.624,160.257,292.275z M168.654,288.285 c2.089-1.666,3.164-3.863,3.454-7.061c0.445-4.903-1.38-8.862-4.801-10.416c-4.465-2.027-9.461,0.254-10.859,4.958 c-2.301,7.749,1.548,14.388,8.103,13.972C166.513,289.613,167.366,289.312,168.654,288.285z M101.001,295.035 c0,0,4.875-16.277,11.589-41.311c0.363-1.353,0.361-1.354-0.992-0.992c-0.746,0.199-9.359,2.511-19.142,5.135 c-9.782,2.625-23.261,6.106-23.261,6.106l-0.71-2.107c0,0,14.118-3.911,24.94-6.813c10.822-2.904,19.764-5.366,19.87-5.473 c0.106-0.105,0.143-12.196,0.082-26.867l-0.127-27.178l-15.102,11.539c-13.638,9.956-15.173,10.965-15.682,10.301 c-1.279-1.668-4.877-8.309-4.677-8.633c0.119-0.191,7.873-3.734,17.232-7.872l17.645-7.252L88.032,179.49l-24.006-13.856v-29.292 v-29.292l24.728-14.272l24.728-14.272l-0.023-46.383l2.667-0.002l-0.042,46.333l24.705,14.369l24.5,14.108l0.121,28.672 l0.121,28.672l23.756,13.762c14.841,8.598,24.081,13.705,24.62,13.608c0.475-0.084,11.457-6.28,24.404-13.769l23.54-13.614 l0.112-19.703l0.112-19.704h1.071h1.071l0.112,19.701l0.112,19.7l24.728,14.262l24.728,14.262v28.585v28.584l22.743,13.149 c12.509,7.231,23.377,13.485,24.151,13.896l1.408,0.747l24.671-14.262c13.57-7.844,24.812-14.185,24.981-14.09 c0.17,0.094,11.315,6.521,24.769,14.281l24.459,14.111l24.727-14.289l24.727-14.29l7.182,4.134 c24.596,14.156,43.118,25.533,43.118,25.533l-1.333,1.416c0,0-14.173-8.178-30.287-17.486c-9.739-5.627-18.001-10.307-18.359-10.4 c-0.358-0.095-11.605,6.156-24.994,13.89s-24.534,14.061-24.769,14.061c-0.233,0-11.375-6.317-24.758-14.038 c-13.382-7.721-24.521-14.037-24.752-14.037s-11.371,6.325-24.756,14.056s-24.635,13.979-25.001,13.886 c-0.365-0.093-11.489-6.418-24.721-14.056c-13.23-7.638-24.245-13.886-24.476-13.886c-0.231,0-11.448,6.365-24.928,14.146 c-13.479,7.78-24.615,14.096-24.747,14.034c-0.132-0.061-11.182-6.426-24.555-14.145c-13.374-7.72-24.507-14.035-24.74-14.035 s-8.145,4.46-17.582,9.911c-9.437,5.451-18.702,10.538-18.702,10.538l-1.125-1.938c0,0,8.527-4.897,18.327-10.545l17.817-10.268 v-27.912v-27.913l-23.85-13.771c-13.117-7.573-24.069-13.77-24.337-13.77c-0.268,0-11.208,6.184-24.311,13.743l-23.823,13.743 v27.954V250l17.579,10.143c9.669,5.578,18.098,10.705,18.098,10.705l-1.125,1.938c0,0-1.615-0.953-17.118-9.895 c-9.284-5.354-17.882-10.355-17.882-10.355l-5.391,19.595l-6.836,23.687L101.001,295.035z M287.441,263.73l23.864-13.741v-27.942 v-27.942l-23.839-13.749c-13.112-7.562-24.06-13.749-24.329-13.749s-11.213,6.193-24.321,13.761l-23.831,13.761v27.928v27.926 l24.039,13.871c13.221,7.63,24.154,13.815,24.296,13.746C263.462,277.529,274.316,271.289,287.441,263.73z M221.032,222.038 v-23.756h1.296h1.296v23.756v23.757h-1.296h-1.296V222.038z M139.397,177.855l23.54-13.628l0.111-27.811l0.111-27.811 l-23.653-13.662c-13.009-7.514-23.959-13.779-24.333-13.922c-0.429-0.165-9.557,4.864-24.729,13.625l-24.049,13.886l0.111,27.884 l0.111,27.885l23.756,13.753c15.057,8.716,24.073,13.692,24.62,13.591C115.468,191.557,126.45,185.352,139.397,177.855z M55.171,222.902v-12.526h1.728h1.728v5.184v5.183h6.479h6.479v-5.183v-5.184h1.728h1.728v12.526v12.525h-1.728h-1.728v-5.831 v-5.831h-6.479h-6.479v5.831v5.831h-1.728h-1.728V222.902z M168.668,160.494l1.916-1.795l1.833,3.417l-2.417,0.671 L168.668,160.494z M174.46,156.452l1.917-2.125l3.208,5.042l-2.708,0.833L174.46,156.452z M180.626,152.536l2.251-2.644 l4.124,6.269l-3.417,0.958L180.626,152.536z M203.755,137.38v-12.526h1.728h1.728v5.184v5.183h6.479h6.479v-5.183v-5.184h1.728 h1.728v12.526v12.526h-1.728h-1.728v-5.831v-5.831h-6.479h-6.479v5.831v5.831h-1.728h-1.728V137.38z M259.169,121.23 c-2.75-0.899-5.109-3.008-6.475-5.79c-1.068-2.175-1.659-3.905-1.695-5.988c-0.042-2.417,0.625-4.972,1.699-7.159 c2.599-5.293,7.992-7.516,13.932-5.744c4.577,1.366,7.396,5.367,7.832,11.114c0.603,7.968-3.701,13.567-10.757,13.996 C262.109,121.756,260.235,121.579,259.169,121.23z M267.566,117.24c2.089-1.666,3.164-3.862,3.454-7.061 c0.445-4.903-1.38-8.862-4.801-10.416c-4.465-2.028-9.461,0.253-10.859,4.958c-2.301,7.75,1.548,14.387,8.103,13.972 C265.425,118.569,266.278,118.267,267.566,117.24z M278.911,108.872V96.346h1.728h1.728v5.183v5.184h6.479h6.479v-5.184v-5.183 h1.728h1.728v12.526v12.526h-1.728h-1.728v-5.831v-5.831h-6.479h-6.479v5.831v5.831h-1.728h-1.728V108.872z";

const POLYGONS = [
  "194.835,140.781 192.001,143.369 197.292,151.578 200.837,149.698",
  "188.668,145.364 186.417,148.078 190.586,154.282 193.792,153.036",
  "134.316,101.968 113.839,89.926 114.496,88.808 115.154,87.691 135.631,99.734 156.109,111.776 155.452,112.894 154.794,114.011",
  "282.935,187.746 262.311,175.957 262.954,174.832 263.597,173.707 284.221,185.496 304.846,197.286 304.204,198.411 303.56,199.536",
  "282.931,256.416 303.49,244.516 304.139,245.638 304.789,246.758 284.229,258.66 263.667,270.561 263.018,269.439 262.368,268.319",
];

const CIRCLES = [
  { cx: 160.438, cy: 296.66, r: 1.625 },
  { cx: 167.562, cy: 296.66, r: 1.625 },
];

const RING_A = "115,81 163,109 163,164 115,192 66,164 66,109";
const RING_B = "164,167 212,194 212,250 164,278 116,250 116,194";
const RING_C = "263,167 311,194 311,250 263,278 215,250 215,194";
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

function Geo({ color, stroke = "none", sw = 0 }) {
  return (
    <g>
      <path
        d={MOLECULE_PATH}
        fill={color}
        fillRule="evenodd"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {POLYGONS.map((p, i) => (
        <polygon
          key={i}
          points={p}
          fill={color}
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      ))}
      {CIRCLES.map((c, i) => (
        <circle
          key={i}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill={color}
          stroke={stroke}
          strokeWidth={sw}
        />
      ))}
    </g>
  );
}

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
    <svg viewBox="0 0 620 336.57" width="100%" style={{ display: "block" }}>
      <defs>
        <filter id="mol-glo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="mol-cc">
          <rect
            x="312"
            y="0"
            width={310 * (zone === 3 ? sweep : 0)}
            height="337"
          />
        </clipPath>
      </defs>
      <g opacity={opacity}>
        <Geo color={color} />
      </g>
      {zone !== null && zone < 3 && (
        <polygon
          points={RING_PATHS[zone]}
          fill="none"
          stroke={bright}
          strokeWidth="3.5"
          strokeLinejoin="round"
          filter="url(#mol-glo)"
          opacity="0.95"
        />
      )}
      {zone === 3 && sweep > 0 && (
        <g clipPath="url(#mol-cc)" opacity={0.9 * sweep} filter="url(#mol-glo)">
          <Geo color={bright} stroke={bright} sw={2.5} />
        </g>
      )}
    </svg>
  );
}

// ─── Exported Component ───
// Props: onClick (optional) — makes entire molecule area clickable
//        showControls (default true) — show intensity/color controls
//        compact (default false) — smaller title for embedding
export default function Delta9THCMolecule({
  onClick,
  showControls = true,
  compact = false,
}) {
  const [tier, setTier] = useState("dark");
  const [color, setColor] = useState("#52b788");
  const [hovered, setHovered] = useState(false);

  const colors = [
    { hex: "#52b788", name: "Green" },
    { hex: "#3B82F6", name: "Blue" },
    { hex: "#EF4444", name: "Red" },
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
            Δ9-Tetrahydrocannabinol
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
              color: "#2d6a4f",
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
