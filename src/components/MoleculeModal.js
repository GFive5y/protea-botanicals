// src/components/MoleculeModal.js v1.0
// Frosted glass overlay modal for individual molecule detail.
// Opens on top of current page — no navigation.
// Close button returns user to where they were.
// Props: molId (string), onClose (function)
import { useEffect } from "react";
import Delta9THCMolecule from "./Delta9THCMolecule";
import Delta8THCMolecule from "./Delta8THCMolecule";
import Delta10THCMolecule from "./Delta10THCMolecule";
import THCaMolecule from "./THCaMolecule";
import CBDMolecule from "./CBDMolecule";
import CBGMolecule from "./CBGMolecule";
import CBNMolecule from "./CBNMolecule";

const COMPONENTS = {
  "d9-thc": Delta9THCMolecule,
  "d8-thc": Delta8THCMolecule,
  "d10-thc": Delta10THCMolecule,
  thca: THCaMolecule,
  cbd: CBDMolecule,
  cbg: CBGMolecule,
  cbn: CBNMolecule,
};

const MOLECULES = {
  "d9-thc": {
    name: "Δ9-THC",
    fullName: "Delta-9-Tetrahydrocannabinol",
    formula: "C₂₁H₃₀O₂",
    color: "#52b788",
    rings: 3,
    boilingPoint: "157°C",
    purity: "93.55%",
    description:
      "The primary psychoactive cannabinoid in cannabis. Delta-9-THC binds to CB1 receptors in the brain, producing euphoria, relaxation, altered perception and appetite stimulation. At Protea Botanicals, our distillate is refined to 93.55% Δ9-THC purity.",
    effects: [
      "Euphoria",
      "Relaxation",
      "Appetite",
      "Pain relief",
      "Creativity",
    ],
    discoveredBy: "Roger Adams (1940)",
  },
  "d8-thc": {
    name: "Δ8-THC",
    fullName: "Delta-8-Tetrahydrocannabinol",
    formula: "C₂₁H₃₀O₂",
    color: "#3B82F6",
    rings: 3,
    boilingPoint: "175°C",
    purity: "3.09%",
    description:
      "A naturally occurring minor cannabinoid with a similar structure to Δ9-THC. The double bond sits at the 8th carbon position instead of the 9th, resulting in milder psychoactive effects. Often described as producing a clearer, less anxious experience.",
    effects: ["Mild euphoria", "Anti-nausea", "Appetite", "Reduced anxiety"],
    discoveredBy: "Raphael Mechoulam (1965)",
  },
  thca: {
    name: "THCa",
    fullName: "Tetrahydrocannabinolic Acid",
    formula: "C₂₂H₃₀O₄",
    color: "#EAB308",
    rings: 3,
    boilingPoint: "105°C (decarbs)",
    purity: "<0.0001%",
    description:
      "The raw, non-psychoactive precursor to THC found in living cannabis plants. THCa converts to Δ9-THC through decarboxylation (heat). In its acid form, THCa shows promising anti-inflammatory and neuroprotective properties.",
    effects: [
      "Anti-inflammatory",
      "Neuroprotective",
      "Anti-emetic",
      "Non-psychoactive",
    ],
    discoveredBy: "Friedhelm Korte (1964)",
  },
  cbd: {
    name: "CBD",
    fullName: "Cannabidiol",
    formula: "C₂₁H₃₀O₂",
    color: "#52b788",
    rings: 2,
    boilingPoint: "180°C",
    purity: "0.98%",
    description:
      "The most abundant non-psychoactive cannabinoid. CBD interacts with the endocannabinoid system without producing a 'high'. Widely studied for anxiety reduction, seizure management and anti-inflammatory properties.",
    effects: [
      "Anti-anxiety",
      "Anti-inflammatory",
      "Seizure reduction",
      "Sleep support",
    ],
    discoveredBy: "Roger Adams (1940)",
  },
  cbn: {
    name: "CBN",
    fullName: "Cannabinol",
    formula: "C₂₁H₂₆O₂",
    color: "#8B5CF6",
    rings: 3,
    boilingPoint: "185°C",
    purity: "0.78%",
    description:
      "A mildly psychoactive cannabinoid that forms as THC ages and oxidises. CBN is often associated with sedative properties. Found in aged cannabis, it represents the natural degradation pathway of THC.",
    effects: [
      "Sedative",
      "Anti-bacterial",
      "Appetite stimulant",
      "Mild psychoactive",
    ],
    discoveredBy: "Robert S. Cahn (1930)",
  },
  cbg: {
    name: "CBG",
    fullName: "Cannabigerol",
    formula: "C₂₁H₃₂O₂",
    color: "#F97316",
    rings: 1,
    boilingPoint: "~52°C (decarboxylation)",
    purity: "0.45%",
    description:
      "Known as the 'mother cannabinoid', CBG is the precursor from which all other cannabinoids are synthesised. Non-psychoactive and being studied for anti-inflammatory, neuroprotective and antibacterial properties.",
    effects: [
      "Anti-inflammatory",
      "Neuroprotective",
      "Antibacterial",
      "Appetite stimulant",
    ],
    discoveredBy: "Yechiel Gaoni & Raphael Mechoulam (1964)",
  },
  "d10-thc": {
    name: "Δ10-THC",
    fullName: "Delta-10-Tetrahydrocannabinol",
    formula: "C₂₁H₃₀O₂",
    color: "#EF4444",
    rings: 3,
    boilingPoint: "~150°C",
    purity: "Trace",
    description:
      "A rare minor cannabinoid isomer with the double bond at the 10th carbon position. Δ10-THC is reported to produce more energetic, sativa-like effects compared to the relaxation of Δ9-THC.",
    effects: ["Energy", "Focus", "Mild euphoria", "Creativity"],
    discoveredBy: "Identified in modern research",
  },
};

export default function MoleculeModal({ molId, onClose }) {
  const mol = MOLECULES[molId];
  const MolComponent = COMPONENTS[molId];

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mol || !MolComponent) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        animation: "mol-modal-bg-in 0.35s ease forwards",
      }}
    >
      <style>{`
        @keyframes mol-modal-bg-in {
          0% { background: rgba(250,249,246,0); backdrop-filter: blur(0px); }
          100% { background: rgba(250,249,246,0.65); backdrop-filter: blur(12px); }
        }
        @keyframes mol-modal-box-in {
          0% { opacity: 0; transform: scale(0.92) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .mol-modal-box {
          animation: mol-modal-box-in 0.4s ease 0.1s both;
        }
        .mol-modal-close {
          transition: background 0.2s, transform 0.2s;
        }
        .mol-modal-close:hover {
          background: rgba(0,0,0,0.08) !important;
          transform: rotate(90deg);
        }
        .mol-modal-effect-tag {
          transition: border-color 0.2s, color 0.2s;
        }
        .mol-modal-effect-tag:hover {
          border-color: ${mol.color} !important;
          color: ${mol.color} !important;
        }
      `}</style>

      {/* Modal box — stop click propagation so clicking inside doesn't close */}
      <div
        className="mol-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #e8e0d4",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)",
          maxWidth: "720px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          className="mol-modal-close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "1px solid #e8e0d4",
            background: "rgba(255,255,255,0.9)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            color: "#888",
            zIndex: 2,
          }}
        >
          ✕
        </button>

        {/* Top section — molecule visual */}
        <div
          style={{
            padding: "40px 32px 24px",
            borderBottom: "1px solid #f0ebe1",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ maxWidth: "340px", width: "100%" }}>
            <MolComponent showControls={true} compact={false} />
          </div>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            padding: "16px 32px",
            borderBottom: "1px solid #f0ebe1",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {[
            { label: "Formula", value: mol.formula },
            { label: "Rings", value: mol.rings },
            { label: "Boiling Point", value: mol.boilingPoint },
            { label: "In Our Distillate", value: mol.purity },
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
                  fontSize: "17px",
                  fontWeight: 400,
                  color: "#1a1a1a",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Info section */}
        <div style={{ padding: "28px 32px 36px" }}>
          {/* Name header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: mol.color,
                boxShadow: `0 0 8px ${mol.color}44`,
              }}
            />
            <span
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: mol.color,
                fontWeight: 500,
              }}
            >
              {mol.name}
            </span>
          </div>

          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 300,
              color: "#1a1a1a",
              marginBottom: "16px",
              lineHeight: 1.2,
            }}
          >
            {mol.fullName}
          </h2>

          <div
            style={{
              width: "40px",
              height: "2px",
              background: mol.color,
              marginBottom: "20px",
            }}
          />

          <p
            style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: "15px",
              lineHeight: 1.9,
              color: "#555",
              fontWeight: 300,
              marginBottom: "24px",
            }}
          >
            {mol.description}
          </p>

          {/* Effects */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "9px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#aaa",
                marginBottom: "10px",
                fontWeight: 500,
              }}
            >
              Key Effects
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {mol.effects.map((e) => (
                <span
                  key={e}
                  className="mol-modal-effect-tag"
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "12px",
                    padding: "5px 12px",
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
          {mol.discoveredBy && (
            <div
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "12px",
                color: "#aaa",
                fontWeight: 300,
                fontStyle: "italic",
              }}
            >
              First identified by {mol.discoveredBy}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
