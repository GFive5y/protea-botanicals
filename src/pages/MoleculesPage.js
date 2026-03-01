// src/pages/MoleculesPage.js v1.4
// Dedicated molecule education page — all 6 cannabinoids.
// D9-THC, D8-THC, D10-THC, THCa, CBD: Full animated molecules with controls.
// CBN: Placeholder hexagon + educational content + "Coming Soon" badge.
// Route: /molecules — linked from Landing.js THC section.
// Uses PageShell if available, fallback to standalone layout.
// v1.1: Added Delta-10-THC live molecule integration.
// v1.2: Added Delta-8-THC live molecule integration.
// v1.3: Added THCa live molecule integration.
// v1.4: Added CBD live molecule integration.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Delta9THCMolecule from "../components/Delta9THCMolecule";
import Delta8THCMolecule from "../components/Delta8THCMolecule";
import Delta10THCMolecule from "../components/Delta10THCMolecule";
import THCaMolecule from "../components/THCaMolecule";
import CBDMolecule from "../components/CBDMolecule";

const MOLECULES = [
  {
    id: "d9-thc",
    name: "Δ9-THC",
    fullName: "Delta-9-Tetrahydrocannabinol",
    formula: "C₂₁H₃₀O₂",
    status: "live",
    color: "#52b788",
    rings: 3,
    description:
      "The primary psychoactive cannabinoid in cannabis. Delta-9-THC binds to CB1 receptors in the brain, producing euphoria, relaxation, altered perception and appetite stimulation. At Protea Botanicals, our distillate is refined to 93.55% Δ9-THC purity.",
    effects: [
      "Euphoria",
      "Relaxation",
      "Appetite",
      "Pain relief",
      "Creativity",
    ],
    legalNote:
      "Regulated substance in South Africa. Protea Botanicals operates within all applicable legal frameworks.",
    purity: "93.55%",
    boilingPoint: "157°C",
    discoveredBy: "Roger Adams (1940)",
  },
  {
    id: "d8-thc",
    name: "Δ8-THC",
    fullName: "Delta-8-Tetrahydrocannabinol",
    formula: "C₂₁H₃₀O₂",
    status: "live",
    color: "#3B82F6",
    rings: 3,
    description:
      "A naturally occurring minor cannabinoid with a similar structure to Δ9-THC. The double bond sits at the 8th carbon position instead of the 9th, resulting in milder psychoactive effects. Often described as producing a clearer, less anxious experience than Δ9-THC.",
    effects: ["Mild euphoria", "Anti-nausea", "Appetite", "Reduced anxiety"],
    purity: "3.09%",
    boilingPoint: "175°C",
    discoveredBy: "Raphael Mechoulam (1965)",
  },
  {
    id: "thca",
    name: "THCa",
    fullName: "Tetrahydrocannabinolic Acid",
    formula: "C₂₂H₃₀O₄",
    status: "live",
    color: "#EAB308",
    rings: 3,
    description:
      "The raw, non-psychoactive precursor to THC found in living cannabis plants. THCa converts to Δ9-THC through decarboxylation (heat). In its acid form, THCa shows promising anti-inflammatory and neuroprotective properties without the intoxicating effects.",
    effects: [
      "Anti-inflammatory",
      "Neuroprotective",
      "Anti-emetic",
      "Non-psychoactive",
    ],
    purity: "<0.0001%",
    boilingPoint: "105°C (decarbs)",
    discoveredBy: "Friedhelm Korte (1964)",
  },
  {
    id: "cbd",
    name: "CBD",
    fullName: "Cannabidiol",
    formula: "C₂₁H₃₀O₂",
    status: "live",
    color: "#52b788",
    rings: 2,
    description:
      "The most abundant non-psychoactive cannabinoid. CBD interacts with the endocannabinoid system without producing a 'high'. Widely studied for its potential therapeutic applications including anxiety reduction, seizure management and anti-inflammatory properties. Our distillate contains 0.98% CBD.",
    effects: [
      "Anti-anxiety",
      "Anti-inflammatory",
      "Seizure reduction",
      "Sleep support",
    ],
    purity: "0.98%",
    boilingPoint: "180°C",
    discoveredBy: "Roger Adams (1940)",
  },
  {
    id: "cbn",
    name: "CBN",
    fullName: "Cannabinol",
    formula: "C₂₁H₂₆O₂",
    status: "coming",
    color: "#8B5CF6",
    rings: 3,
    description:
      "A mildly psychoactive cannabinoid that forms as THC ages and oxidises. CBN is often associated with sedative properties, though research is still emerging. Found in aged cannabis, it represents the natural degradation pathway of THC. Our distillate contains 0.78% CBN.",
    effects: [
      "Sedative",
      "Anti-bacterial",
      "Appetite stimulant",
      "Mild psychoactive",
    ],
    purity: "0.78%",
    boilingPoint: "185°C",
    discoveredBy: "Robert S. Cahn (1930)",
  },
  {
    id: "d10-thc",
    name: "Δ10-THC",
    fullName: "Delta-10-Tetrahydrocannabinol",
    formula: "C₂₁H₃₀O₂",
    status: "live",
    color: "#EF4444",
    rings: 3,
    description:
      "A rare minor cannabinoid isomer with the double bond at the 10th carbon position. Δ10-THC is reported to produce more energetic, sativa-like effects compared to the relaxation of Δ9-THC. Research is limited, but early studies suggest potential nootropic and focus-enhancing properties.",
    effects: ["Energy", "Focus", "Mild euphoria", "Creativity"],
    purity: "Trace",
    boilingPoint: "~150°C",
    discoveredBy: "Identified in modern research",
  },
];

// Simple placeholder hexagonal molecule for "coming soon" entries
function PlaceholderMolecule({ color }) {
  const opacity = 0.25;
  return (
    <svg
      viewBox="0 0 200 180"
      width="100%"
      style={{ display: "block", maxWidth: "300px", margin: "0 auto" }}
    >
      <defs>
        <filter id="ph-glo" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {/* 3 fused hexagons */}
      <g
        opacity={opacity}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      >
        {/* Ring A */}
        <polygon points="60,30 90,15 120,30 120,60 90,75 60,60" />
        {/* Ring B */}
        <polygon points="60,60 90,75 90,105 60,120 30,105 30,75" />
        {/* Ring C */}
        <polygon points="120,60 150,75 150,105 120,120 90,105 90,75" />
        {/* Chain */}
        <polyline points="150,75 170,68 190,75" />
        <polyline points="150,105 170,112 190,105" />
      </g>
      {/* Animated glow ring */}
      <polygon
        points="60,60 90,75 90,105 60,120 30,105 30,75"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        filter="url(#ph-glo)"
        opacity="0.3"
      >
        <animate
          attributeName="opacity"
          values="0.15;0.4;0.15"
          dur="3s"
          repeatCount="indefinite"
        />
      </polygon>
    </svg>
  );
}

export default function MoleculesPage() {
  const navigate = useNavigate();
  const [activeMol, setActiveMol] = useState("d9-thc");
  const active = MOLECULES.find((m) => m.id === activeMol);

  return (
    <div
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        background: "#faf9f6",
        color: "#1a1a1a",
        minHeight: "100vh",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Hero */}
      <section
        style={{
          padding: "80px 24px 60px",
          textAlign: "center",
          background: "linear-gradient(160deg, #faf9f6 0%, #e8f5ee 100%)",
        }}
      >
        <span
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#52b788",
          }}
        >
          THE SCIENCE
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
          Our Cannabinoid Profiles
        </h1>
        <div
          style={{
            width: "48px",
            height: "2px",
            background: "#2d6a4f",
            margin: "0 auto 24px",
          }}
        />
        <p
          style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: "16px",
            color: "#555",
            fontWeight: 300,
            maxWidth: "600px",
            margin: "0 auto",
            lineHeight: 1.8,
          }}
        >
          Every Protea Botanicals product is lab-certified with a full
          cannabinoid breakdown. Explore the molecules that define our
          distillate.
        </p>
      </section>

      {/* Molecule Selector Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "4px",
          padding: "20px 24px",
          flexWrap: "wrap",
          borderBottom: "1px solid #e8e0d4",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {MOLECULES.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMol(m.id)}
            style={{
              padding: "8px 16px",
              fontSize: "11px",
              fontFamily: "'Jost', sans-serif",
              fontWeight: activeMol === m.id ? 600 : 400,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: `1px solid ${activeMol === m.id ? m.color : "#e8e0d4"}`,
              borderRadius: "2px",
              background: activeMol === m.id ? m.color : "transparent",
              color: activeMol === m.id ? "#fff" : "#888",
              cursor: "pointer",
              transition: "all 0.25s",
              position: "relative",
            }}
          >
            {m.name}
            {m.status === "coming" && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#e8e0d4",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Active Molecule Detail */}
      {active && (
        <section style={{ padding: "60px 24px 100px" }}>
          <div
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              display: "flex",
              gap: "48px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* LEFT — Molecule Visual */}
            <div style={{ flex: "0 1 420px", minWidth: "280px" }}>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e8e0d4",
                  borderRadius: "2px",
                  padding: "32px 20px",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
                }}
              >
                {active.status === "live" ? (
                  active.id === "cbd" ? (
                    <CBDMolecule showControls={true} compact={false} />
                  ) : active.id === "thca" ? (
                    <THCaMolecule showControls={true} compact={false} />
                  ) : active.id === "d8-thc" ? (
                    <Delta8THCMolecule showControls={true} compact={false} />
                  ) : active.id === "d10-thc" ? (
                    <Delta10THCMolecule showControls={true} compact={false} />
                  ) : (
                    <Delta9THCMolecule showControls={true} compact={false} />
                  )
                ) : (
                  <div>
                    <div style={{ textAlign: "center", marginBottom: "12px" }}>
                      <div
                        style={{
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: "15px",
                          fontWeight: 300,
                          color: "#1a1a1a",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {active.fullName}
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
                        Coming Soon
                      </div>
                    </div>
                    <PlaceholderMolecule color={active.color} />
                  </div>
                )}
              </div>

              {/* Formula card */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e8e0d4",
                  borderRadius: "2px",
                  padding: "20px",
                  marginTop: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                {[
                  { label: "Formula", value: active.formula },
                  { label: "Rings", value: active.rings },
                  { label: "Boiling Point", value: active.boilingPoint },
                  { label: "In Our Distillate", value: active.purity },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{ textAlign: "center", flex: "1 1 80px" }}
                  >
                    <div
                      style={{
                        fontFamily: "'Jost', sans-serif",
                        fontSize: "9px",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "#aaa",
                        marginBottom: "4px",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: "18px",
                        fontWeight: 400,
                        color: "#1a1a1a",
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Info */}
            <div style={{ flex: "1 1 400px", minWidth: "300px" }}>
              {/* Header */}
              <div
                style={{
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "11px",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: active.color,
                    fontWeight: 500,
                  }}
                >
                  {active.name}
                </span>
                {active.status === "coming" && (
                  <span
                    style={{
                      fontFamily: "'Jost', sans-serif",
                      fontSize: "8px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "#b5935a",
                      background: "rgba(181,147,90,0.1)",
                      padding: "3px 8px",
                      borderRadius: "2px",
                    }}
                  >
                    Molecule Animation Coming Soon
                  </span>
                )}
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 300,
                  color: "#1a1a1a",
                  marginBottom: "24px",
                  lineHeight: 1.2,
                }}
              >
                {active.fullName}
              </h2>
              <div
                style={{
                  width: "48px",
                  height: "2px",
                  background: active.color,
                  marginBottom: "24px",
                }}
              />

              {/* Description */}
              <p
                style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: "16px",
                  lineHeight: 1.9,
                  color: "#555",
                  fontWeight: 300,
                  marginBottom: "32px",
                }}
              >
                {active.description}
              </p>

              {/* Effects */}
              <div style={{ marginBottom: "32px" }}>
                <div
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "10px",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: "#888",
                    marginBottom: "12px",
                    fontWeight: 500,
                  }}
                >
                  Key Effects
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {active.effects.map((e) => (
                    <span
                      key={e}
                      style={{
                        fontFamily: "'Jost', sans-serif",
                        fontSize: "12px",
                        padding: "6px 14px",
                        borderRadius: "2px",
                        border: "1px solid #e8e0d4",
                        color: "#555",
                        fontWeight: 400,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>

              {/* Discovery */}
              {active.discoveredBy && (
                <div
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "13px",
                    color: "#888",
                    fontWeight: 300,
                    fontStyle: "italic",
                    marginBottom: "32px",
                  }}
                >
                  First identified by {active.discoveredBy}
                </div>
              )}

              {/* Legal note for D9-THC */}
              {active.legalNote && (
                <div
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "12px",
                    color: "#aaa",
                    fontWeight: 300,
                    padding: "12px 16px",
                    background: "#f4f0e8",
                    borderRadius: "2px",
                    borderLeft: `3px solid ${active.color}`,
                  }}
                >
                  {active.legalNote}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* COA Reference */}
      <section
        style={{
          padding: "60px 24px",
          background: "#f4f0e8",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <span
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "11px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#2d6a4f",
            }}
          >
            LAB CERTIFIED
          </span>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 300,
              color: "#1a1a1a",
              margin: "12px 0 16px",
            }}
          >
            Full Certificate of Analysis
          </h2>
          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "14px",
              color: "#555",
              fontWeight: 300,
              lineHeight: 1.8,
              marginBottom: "28px",
            }}
          >
            Every batch is tested by Ecogreen Analytics (Pty) Ltd — a
            SANAS-accredited, SAHPRA-licensed laboratory. Scan any product QR
            code to view the full COA including all cannabinoid percentages,
            terpene profiles and safety testing.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => navigate("/shop")}
              style={{
                fontFamily: "'Jost', sans-serif",
                padding: "12px 32px",
                background: "#2d6a4f",
                color: "#faf9f6",
                border: "none",
                borderRadius: "2px",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontWeight: 500,
                transition: "background 0.3s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#1b4332")}
              onMouseLeave={(e) => (e.target.style.background = "#2d6a4f")}
            >
              Shop Products
            </button>
            <button
              onClick={() => navigate("/")}
              style={{
                fontFamily: "'Jost', sans-serif",
                padding: "12px 32px",
                background: "transparent",
                color: "#2d6a4f",
                border: "1px solid #2d6a4f",
                borderRadius: "2px",
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontWeight: 500,
                transition: "all 0.3s",
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
