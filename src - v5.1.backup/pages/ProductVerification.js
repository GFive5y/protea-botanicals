// src/pages/ProductVerification.js
import { useParams, useNavigate } from "react-router-dom";

// ── Distillate COA Data (Ecogreen Analytics — Lab ID: JB26-046-01) ──────────
const DISTILLATE_COA = {
  labId: "JB26-046-01",
  sampleId: "D9DSOL160126",
  lab: "Ecogreen Analytics (Pty) Ltd.",
  labLocation: "Somerset West, Western Cape",
  accreditation: "SANAS T1045 · SAHPRA Licensed · ILAC-MRA",
  reportedDate: "2026/01/23",
  method: "HPLC with UV detection (ME-EA-001)",
  cannabinoids: [
    { name: "D9-THC", value: 93.5527, highlight: true },
    { name: "D8-THC", value: 3.088, highlight: false },
    { name: "CBD", value: 0.9756, highlight: false },
    { name: "CBN", value: 0.7809, highlight: false },
    { name: "CBG", value: 0.0868, highlight: false },
    { name: "CBDA", value: 0.043, highlight: false },
    { name: "THCA", value: 0.0001, highlight: false },
  ],
  totals: [
    { name: "Total THC", value: "93.55%" },
    { name: "Total CBD", value: "1.01%" },
    { name: "Total Cannabinoids", value: "98.53%" },
  ],
  otherTests: [
    { name: "Residual Solvents", status: "pending" },
    { name: "Heavy Metals", status: "pending" },
    { name: "Pesticides", status: "pending" },
    { name: "Mycotoxins", status: "pending" },
    { name: "Microbials", status: "pending" },
  ],
};

// ── Strain Database ───────────────────────────────────────────────────────────
const STRAINS = {
  "pineapple-express": {
    id: "pineapple-express",
    name: "Pineapple Express",
    line: "Pure Terpenes Line",
    lineCode: "6-11-0002",
    type: "Sativa-Dominant Hybrid",
    typeColor: "#52b788",
    accentColor: "#e8a020",
    gradientFrom: "#1b4332",
    gradientTo: "#2d6a4f",
    icon: "⬡",
    tagline: "Vibrant. Tropical. Energising.",
    description:
      "Bright pineapple and citrus notes blend with earthy pine for a vibrant, tropical, and refreshing aroma experience. A combination of exotic sweet pineapple flavor with cedar and pine notes, as well as fine fruity undertones. One of the most recognised sativa profiles in the world.",
    effects: ["Euphoric", "Creative", "Uplifting", "Energising", "Focused"],
    dominantTerpenes: [
      {
        name: "Myrcene",
        role: "Earthy base · Relaxing undercurrent",
        color: "#2d6a4f",
      },
      {
        name: "Caryophyllene",
        role: "Spicy pine · Anti-inflammatory",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Citrus lift · Mood elevation",
        color: "#e8a020",
      },
      {
        name: "Ocimene",
        role: "Sweet tropical · Floral brightness",
        color: "#4a9eba",
      },
    ],
    aroma: "Pineapple · Citrus · Cedar · Pine · Tropical Fruit",
    flavour: "Sweet Pineapple · Earthy Pine · Fresh Citrus",
    eybnaLine: "Pure Terpenes Line",
    eybnaDescription:
      "Eybna's Pure Terpenes Line captures strain-authentic aromatic profiles using only botanical-derived terpenes, without any additives or cutting agents.",
  },
  "gelato-41": {
    id: "gelato-41",
    name: "Gelato #41",
    line: "Palate Line",
    lineCode: "8-13-0002",
    type: "Indica-Dominant Hybrid",
    typeColor: "#9b6b9e",
    accentColor: "#c084d4",
    gradientFrom: "#2a1a3e",
    gradientTo: "#5a2d7a",
    icon: "◉",
    tagline: "Sweet. Creamy. Deeply Relaxing.",
    description:
      "Gelato #41 combines Sunset Sherbert and Thin Mint genetics, delivering a sweet and earthy aroma with notes of lavender and pine. Dominated by caryophyllene, limonene and myrcene, this dessert-forward strain delivers creative euphoria that melts into deep body relaxation.",
    effects: ["Relaxing", "Euphoric", "Creative", "Happy", "Sleepy"],
    dominantTerpenes: [
      {
        name: "Caryophyllene",
        role: "Peppery spice · Anti-inflammatory",
        color: "#b5935a",
      },
      {
        name: "Limonene",
        role: "Citrus zest · Stress relief",
        color: "#e8c020",
      },
      {
        name: "Myrcene",
        role: "Musky floral · Calming sedation",
        color: "#2d6a4f",
      },
      { name: "Linalool", role: "Lavender · Sleep support", color: "#9b6b9e" },
    ],
    aroma: "Sweet Cream · Lavender · Earthy Pine · Berry · Vanilla",
    flavour: "Creamy Dessert · Citrus · Sweet Earth · Mint Finish",
    eybnaLine: "Palate Line",
    eybnaDescription:
      "Eybna's Palate Line elevates classic strain profiles with enhanced flavour clarity and aromatic depth, designed for a premium sensory experience.",
  },
  "cinnamon-kush-cake": {
    id: "cinnamon-kush-cake",
    name: "Cinnamon Kush Cake",
    line: "Live Line",
    lineCode: "7-803-0002",
    type: "Indica-Dominant",
    typeColor: "#c0764a",
    accentColor: "#d4894a",
    gradientFrom: "#2a1a0e",
    gradientTo: "#7c3a10",
    icon: "◈",
    tagline: "Warm. Spiced. Evening Comfort.",
    description:
      "Sweet and spicy cinnamon bun with deep kush notes. An indica-dominant strain that delivers warm, spiced comfort with a vanilla and earthy peppermint base. The Live Line captures the aromatic peak of the cannabis plant at harvest, expressing its most pure and pungent flavours.",
    effects: [
      "Deeply Relaxing",
      "Sedating",
      "Body Calm",
      "Sleep Aid",
      "Stress Relief",
    ],
    dominantTerpenes: [
      {
        name: "Caryophyllene",
        role: "Warm spice · Analgesic properties",
        color: "#c0764a",
      },
      {
        name: "Myrcene",
        role: "Earthy kush · Sedative body effect",
        color: "#2d6a4f",
      },
      {
        name: "Linalool",
        role: "Floral sweetness · Sleep support",
        color: "#9b6b9e",
      },
      {
        name: "Terpinolene",
        role: "Vanilla pine · Herbal warmth",
        color: "#b5935a",
      },
    ],
    aroma: "Cinnamon · Vanilla · Kush · Earthy Spice · Baked Dough",
    flavour: "Spiced Cinnamon Bun · Earthy Peppermint · Vanilla Kush",
    eybnaLine: "Live Line",
    eybnaDescription:
      "Eybna's Live Line is composed exclusively of botanical-derived terpenes that capture the aromatic peak of the cannabis plant just before harvest — the most pure and pungent expression of each profile.",
  },
  "sweet-watermelon": {
    id: "sweet-watermelon",
    name: "Sweet Watermelon",
    line: "Enhancer Line",
    lineCode: "10-520-0002",
    type: "Sativa-Hybrid",
    typeColor: "#e05a7a",
    accentColor: "#f07090",
    gradientFrom: "#1a1a2e",
    gradientTo: "#6a1a3a",
    icon: "◎",
    tagline: "Fresh. Juicy. Uplifting.",
    description:
      "A vibrant tropical flavour that balances sweet and tart notes with a refreshing, juicy finish. Sweet Watermelon from Eybna's Enhancer Line is designed to amplify and elevate extract profiles with a bright, clean fruit character that enhances the overall sensory experience.",
    effects: ["Uplifting", "Refreshing", "Happy", "Social", "Light Euphoria"],
    dominantTerpenes: [
      {
        name: "Limonene",
        role: "Fresh citrus lift · Mood boost",
        color: "#e8c020",
      },
      {
        name: "Ocimene",
        role: "Sweet tropical · Floral notes",
        color: "#52b788",
      },
      {
        name: "Myrcene",
        role: "Fruity base · Smooth body effect",
        color: "#2d6a4f",
      },
      {
        name: "Linalool",
        role: "Floral sweetness · Gentle calm",
        color: "#9b6b9e",
      },
    ],
    aroma: "Sweet Watermelon · Fresh Citrus · Tropical Fruit · Floral",
    flavour: "Juicy Watermelon · Sweet Tart · Fresh Finish",
    eybnaLine: "Enhancer Line",
    eybnaDescription:
      "Eybna's Enhancer Line is formulated to amplify and brighten the natural terpene presence in cannabis extracts, adding vibrant fruit and floral dimension to any base profile.",
  },
  zkz: {
    id: "zkz",
    name: "ZKZ",
    line: "Live Plus+ Line",
    lineCode: "14-501-0002",
    type: "Balanced Hybrid",
    typeColor: "#4a9eba",
    accentColor: "#5ab8d4",
    gradientFrom: "#0a1a2e",
    gradientTo: "#1a4a6e",
    icon: "◇",
    tagline: "Sweet. Candy. Award-Winning.",
    description:
      "An award-winning, California-bred strain that is a cross between famously fruity genetics, producing a unique sensory experience. ZKZ is known for its sweet and candy-like flavour, characterised by strong fruity notes and ripe strawberry. One of the most celebrated profiles in the premium cannabis market.",
    effects: ["Euphoric", "Relaxing", "Happy", "Creative", "Balanced"],
    dominantTerpenes: [
      {
        name: "Limonene",
        role: "Sweet candy citrus · Euphoria",
        color: "#e8c020",
      },
      {
        name: "Caryophyllene",
        role: "Fruity spice · Anti-anxiety",
        color: "#b5935a",
      },
      {
        name: "Linalool",
        role: "Floral sweetness · Balance",
        color: "#9b6b9e",
      },
      { name: "Myrcene", role: "Ripe berry · Smooth body", color: "#2d6a4f" },
    ],
    aroma: "Candy · Ripe Strawberry · Sweet Fruit · Citrus · Berry",
    flavour: "Sweet Candy · Fruity · Ripe Strawberry · Citrus Finish",
    eybnaLine: "Live Plus+ Line",
    eybnaDescription:
      "Eybna's Live Plus+ Line represents the pinnacle of terpene formulation — combining live terpene accuracy with enhanced aromatic intensity for the most complex, multi-layered sensory profiles available.",
  },
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap');
  .shop-font  { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font  { font-family: 'Jost', sans-serif; }

  .pb-btn {
    font-family: 'Jost', sans-serif;
    padding: 13px 36px;
    background: #1b4332;
    color: white;
    border: none;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
  }
  .pb-btn:hover { background: #2d6a4f; }
  .pb-btn-outline {
    font-family: 'Jost', sans-serif;
    padding: 13px 36px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.35);
    color: white;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  }
  .pb-btn-outline:hover { background: rgba(255,255,255,0.1); }

  .strain-nav-btn { transition: all 0.2s; }
  .strain-nav-btn:hover { transform: translateY(-2px); }

  .terpene-bar { transition: width 1s ease; }

  .coa-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 2px;
    font-family: 'Jost', sans-serif;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 500;
  }

  .effect-tag {
    font-family: 'Jost', sans-serif;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 5px 14px;
    border-radius: 2px;
    border: 1px solid;
    font-weight: 400;
  }

  .section-divider {
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent);
    margin: 48px 0;
  }

  .card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 2px;
    backdrop-filter: blur(8px);
  }

  .card-light {
    background: white;
    border: 1px solid #e8e0d4;
    border-radius: 2px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.05);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.7s ease forwards; }
  .fade-up-2 { animation: fadeUp 0.7s 0.15s ease forwards; opacity: 0; }
  .fade-up-3 { animation: fadeUp 0.7s 0.3s ease forwards; opacity: 0; }
  .fade-up-4 { animation: fadeUp 0.7s 0.45s ease forwards; opacity: 0; }
`;

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProductVerification() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const strain = STRAINS[productId] || STRAINS["pineapple-express"];
  const allStrains = Object.values(STRAINS);

  const maxCannabinoid = Math.max(
    ...DISTILLATE_COA.cannabinoids.map((c) => c.value),
  );

  return (
    <div
      style={{
        fontFamily: "'Jost', sans-serif",
        minHeight: "100vh",
        background: "#0e1a14",
        color: "#faf9f6",
      }}
    >
      <style>{styles}</style>

      {/* ── HERO ── */}
      <div
        style={{
          background: `linear-gradient(160deg, ${strain.gradientFrom} 0%, ${strain.gradientTo} 60%, #0e1a14 100%)`,
          padding: "0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `${strain.accentColor}10`,
            pointerEvents: "none",
          }}
        />

        {/* Nav bar */}
        <nav
          style={{
            padding: "20px 40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div
            onClick={() => navigate("/")}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "18px" }}>🌿</span>
            <span
              className="shop-font"
              style={{
                fontSize: "18px",
                letterSpacing: "0.15em",
                color: "#faf9f6",
              }}
            >
              PROTEA <span style={{ color: "#52b788" }}>BOTANICALS</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span
              className="coa-badge"
              style={{
                background: "rgba(82,183,136,0.15)",
                color: "#52b788",
                border: "1px solid rgba(82,183,136,0.3)",
              }}
            >
              ✓ Lab Verified
            </span>
            <span
              className="coa-badge"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              QR Authenticated
            </span>
          </div>
        </nav>

        {/* Hero content */}
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "72px 40px 80px",
          }}
        >
          <div className="fade-up" style={{ marginBottom: 12 }}>
            <span
              className="body-font"
              style={{
                fontSize: "10px",
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                color: strain.accentColor,
                fontWeight: 500,
              }}
            >
              {strain.eybnaLine} · Product Authentication
            </span>
          </div>

          <h1
            className="shop-font fade-up-2"
            style={{
              fontSize: "clamp(48px, 8vw, 96px)",
              fontWeight: 300,
              color: "#faf9f6",
              lineHeight: 1,
              marginBottom: 16,
              letterSpacing: "0.03em",
            }}
          >
            {strain.name}
          </h1>

          <p
            className="body-font fade-up-3"
            style={{
              fontSize: "clamp(14px, 2vw, 17px)",
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              marginBottom: 32,
              fontWeight: 300,
            }}
          >
            {strain.tagline}
          </p>

          {/* Type + effects row */}
          <div
            className="fade-up-4"
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 48,
            }}
          >
            <span
              className="effect-tag"
              style={{
                color: strain.typeColor,
                borderColor: `${strain.typeColor}55`,
                background: `${strain.typeColor}12`,
              }}
            >
              {strain.type}
            </span>
            {strain.effects.map((e) => (
              <span
                key={e}
                className="effect-tag"
                style={{
                  color: "rgba(255,255,255,0.55)",
                  borderColor: "rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                {e}
              </span>
            ))}
          </div>

          {/* Description */}
          <p
            className="body-font fade-up-4"
            style={{
              maxWidth: 640,
              fontSize: 16,
              lineHeight: 1.85,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 300,
            }}
          >
            {strain.description}
          </p>

          {/* Aroma / Flavour pills */}
          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 40,
              flexWrap: "wrap",
            }}
          >
            {[
              ["Aroma", strain.aroma],
              ["Flavour", strain.flavour],
            ].map(([label, val]) => (
              <div key={label}>
                <p
                  className="body-font"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.3em",
                    color: strain.accentColor,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  {label}
                </p>
                <p
                  className="body-font"
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.65)",
                    fontWeight: 300,
                  }}
                >
                  {val}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 40px" }}>
        {/* ── DISTILLATE COA ── */}
        <div style={{ marginBottom: 72 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 40,
            }}
          >
            <div>
              <span
                className="body-font"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.35em",
                  textTransform: "uppercase",
                  color: "#52b788",
                }}
              >
                Certificate of Analysis
              </span>
              <h2
                className="shop-font"
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)",
                  fontWeight: 300,
                  color: "#faf9f6",
                  marginTop: 8,
                }}
              >
                Distillate Lab Results
              </h2>
            </div>
            <div className="card" style={{ padding: "12px 20px" }}>
              <p
                className="body-font"
                style={{
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Lab ID
              </p>
              <p
                className="body-font"
                style={{ fontSize: 14, color: "#52b788", fontWeight: 500 }}
              >
                {DISTILLATE_COA.labId}
              </p>
              <p
                className="body-font"
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 2,
                }}
              >
                {DISTILLATE_COA.reportedDate}
              </p>
            </div>
          </div>

          {/* Lab details strip */}
          <div
            className="card"
            style={{
              padding: "20px 28px",
              marginBottom: 24,
              display: "flex",
              gap: 40,
              flexWrap: "wrap",
            }}
          >
            {[
              ["Laboratory", DISTILLATE_COA.lab],
              ["Location", DISTILLATE_COA.labLocation],
              ["Accreditation", DISTILLATE_COA.accreditation],
              ["Method", DISTILLATE_COA.method],
            ].map(([label, val]) => (
              <div key={label}>
                <p
                  className="body-font"
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.25em",
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </p>
                <p
                  className="body-font"
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.7)",
                    fontWeight: 300,
                  }}
                >
                  {val}
                </p>
              </div>
            ))}
          </div>

          {/* Cannabinoid bars */}
          <div
            className="card"
            style={{ padding: "32px 36px", marginBottom: 20 }}
          >
            <p
              className="body-font"
              style={{
                fontSize: "10px",
                letterSpacing: "0.3em",
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                marginBottom: 28,
              }}
            >
              Cannabinoid Profile
            </p>
            {DISTILLATE_COA.cannabinoids.map((c) => (
              <div key={c.name} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 7,
                  }}
                >
                  <span
                    className="body-font"
                    style={{
                      fontSize: 13,
                      fontWeight: c.highlight ? 600 : 300,
                      color: c.highlight ? "#52b788" : "rgba(255,255,255,0.6)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    className="body-font"
                    style={{
                      fontSize: 13,
                      fontWeight: c.highlight ? 600 : 400,
                      color: c.highlight ? "#52b788" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {c.value.toFixed(4)}%
                  </span>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 2,
                    height: c.highlight ? 8 : 5,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="terpene-bar"
                    style={{
                      width: `${(c.value / maxCannabinoid) * 100}%`,
                      height: "100%",
                      background: c.highlight
                        ? "linear-gradient(90deg, #1b4332, #52b788)"
                        : "rgba(255,255,255,0.2)",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Totals */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.1)",
                marginTop: 28,
                paddingTop: 24,
                display: "flex",
                gap: 40,
                flexWrap: "wrap",
              }}
            >
              {DISTILLATE_COA.totals.map((t) => (
                <div key={t.name}>
                  <p
                    className="body-font"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.25em",
                      color: "rgba(255,255,255,0.35)",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    {t.name}
                  </p>
                  <p
                    className="shop-font"
                    style={{ fontSize: 32, color: "#52b788", fontWeight: 300 }}
                  >
                    {t.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Other tests grid */}
          <div>
            <p
              className="body-font"
              style={{
                fontSize: "10px",
                letterSpacing: "0.3em",
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Additional Testing
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {DISTILLATE_COA.otherTests.map((t) => (
                <div
                  key={t.name}
                  className="card"
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    className="body-font"
                    style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}
                  >
                    {t.name}
                  </span>
                  <span
                    className="coa-badge"
                    style={{
                      background: "rgba(181,147,90,0.12)",
                      color: "#b5935a",
                      border: "1px solid rgba(181,147,90,0.25)",
                      fontSize: "9px",
                    }}
                  >
                    Pending
                  </span>
                </div>
              ))}
            </div>
            <p
              className="body-font"
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.25)",
                marginTop: 14,
                fontStyle: "italic",
                fontWeight: 300,
              }}
            >
              Additional testing for residual solvents, heavy metals, pesticides
              and microbials will be completed on subsequent batches and
              published here.
            </p>
          </div>
        </div>

        <div className="section-divider" />

        {/* ── TERPENE PROFILE ── */}
        <div style={{ marginBottom: 72 }}>
          <div style={{ marginBottom: 40 }}>
            <span
              className="body-font"
              style={{
                fontSize: "10px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: strain.accentColor,
              }}
            >
              Eybna {strain.eybnaLine}
            </span>
            <h2
              className="shop-font"
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 300,
                color: "#faf9f6",
                marginTop: 8,
                marginBottom: 12,
              }}
            >
              Terpene Profile
            </h2>
            <p
              className="body-font"
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.45)",
                fontWeight: 300,
                maxWidth: 560,
              }}
            >
              {strain.eybnaDescription}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {strain.dominantTerpenes.map((t, i) => (
              <div
                key={t.name}
                className="card"
                style={{
                  padding: "28px 24px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: t.color,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <h3
                    className="shop-font"
                    style={{ fontSize: 22, fontWeight: 400, color: "#faf9f6" }}
                  >
                    {t.name}
                  </h3>
                  <span
                    className="body-font"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.2em",
                      color: "rgba(255,255,255,0.3)",
                      textTransform: "uppercase",
                      paddingTop: 4,
                    }}
                  >
                    #{i + 1}
                  </span>
                </div>
                <p
                  className="body-font"
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.6,
                    fontWeight: 300,
                  }}
                >
                  {t.role}
                </p>
                <div
                  style={{
                    marginTop: 16,
                    height: 2,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${90 - i * 12}%`,
                      height: "100%",
                      background: t.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Eybna attribution */}
          <div
            className="card"
            style={{
              padding: "20px 28px",
              display: "flex",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                className="body-font"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Terpene Supplier
              </p>
              <p
                className="body-font"
                style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}
              >
                <strong style={{ color: "#faf9f6" }}>Eybna GmbH</strong> ·
                Berlin, Germany ·{" "}
                <span style={{ color: "rgba(255,255,255,0.4)" }}>
                  www.eybna.com
                </span>
              </p>
              <p
                className="body-font"
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                  marginTop: 4,
                  fontWeight: 300,
                }}
              >
                Product Code: {strain.lineCode} · Pharmaceutical-grade
                botanical-derived terpenes. COA available on request.
              </p>
            </div>
            <span
              className="coa-badge"
              style={{
                background: "rgba(82,183,136,0.12)",
                color: "#52b788",
                border: "1px solid rgba(82,183,136,0.25)",
              }}
            >
              ✓ Certified Supplier
            </span>
          </div>
        </div>

        <div className="section-divider" />

        {/* ── WHAT THIS MEANS ── */}
        <div style={{ marginBottom: 72 }}>
          <span
            className="body-font"
            style={{
              fontSize: "10px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Understanding Your Product
          </span>
          <h2
            className="shop-font"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 300,
              color: "#faf9f6",
              marginTop: 8,
              marginBottom: 40,
            }}
          >
            What These Numbers Mean
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                icon: "◈",
                title: "93.55% Total THC",
                color: "#52b788",
                body: "This is a pharmaceutical-grade distillate. Most commercial cannabis products range from 60–80% THC. Our distillate exceeds 93%, meaning less product is needed for a consistent, controlled effect.",
              },
              {
                icon: "◉",
                title: "The Entourage Effect",
                color: strain.accentColor,
                body: "The minor cannabinoids CBN (0.78%), CBD (0.98%) and CBG (0.09%) work synergistically with THC and terpenes to shape the overall experience — this is known as the entourage effect.",
              },
              {
                icon: "❋",
                title: "Terpene Blending",
                color: "#b5935a",
                body: `The ${strain.name} terpene profile from Eybna is blended with the distillate to recreate the authentic strain experience. Terpenes determine aroma, flavour and modulate the effect profile.`,
              },
              {
                icon: "△",
                title: "CO₂ Extracted",
                color: "#4a9eba",
                body: "Our distillate is produced using supercritical CO₂ extraction — the cleanest method available. Zero solvent residue, no heavy metals from equipment, and no pesticides from the source material.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="card"
                style={{ padding: "28px 24px" }}
              >
                <div
                  style={{ fontSize: 28, color: item.color, marginBottom: 14 }}
                >
                  {item.icon}
                </div>
                <h3
                  className="shop-font"
                  style={{
                    fontSize: 20,
                    color: "#faf9f6",
                    marginBottom: 12,
                    fontWeight: 400,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  className="body-font"
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.75,
                    fontWeight: 300,
                  }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="section-divider" />

        {/* ── EARN POINTS CTA ── */}
        <div
          style={{
            background: "linear-gradient(135deg, #1b4332, #2d6a4f)",
            borderRadius: 2,
            padding: "52px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 32,
            marginBottom: 72,
          }}
        >
          <div>
            <p
              className="body-font"
              style={{
                fontSize: "10px",
                letterSpacing: "0.35em",
                color: "#52b788",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Loyalty Programme
            </p>
            <h2
              className="shop-font"
              style={{
                fontSize: "clamp(24px, 3vw, 40px)",
                fontWeight: 300,
                color: "#faf9f6",
                marginBottom: 12,
              }}
            >
              Earn Points on This Purchase
            </h2>
            <p
              className="body-font"
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.6)",
                fontWeight: 300,
                maxWidth: 440,
              }}
            >
              Scan the unique loyalty QR code found inside your product
              packaging to earn points and unlock exclusive rewards.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              className="pb-btn"
              style={{
                background: "#52b788",
                color: "#0e1a14",
                fontWeight: 600,
              }}
              onClick={() => navigate("/scan")}
            >
              Scan Loyalty Code
            </button>
            <button
              className="pb-btn-outline"
              onClick={() => navigate("/loyalty")}
            >
              View My Points
            </button>
          </div>
        </div>

        {/* ── OTHER STRAINS ── */}
        <div>
          <span
            className="body-font"
            style={{
              fontSize: "10px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Our Range
          </span>
          <h2
            className="shop-font"
            style={{
              fontSize: "clamp(24px, 3vw, 36px)",
              fontWeight: 300,
              color: "#faf9f6",
              marginTop: 8,
              marginBottom: 28,
            }}
          >
            Explore Other Strains
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {allStrains.map((s) => (
              <div
                key={s.id}
                className="strain-nav-btn"
                onClick={() => navigate(`/verify/${s.id}`)}
                style={{
                  background:
                    s.id === strain.id
                      ? `linear-gradient(135deg, ${s.gradientFrom}, ${s.gradientTo})`
                      : "rgba(255,255,255,0.04)",
                  border: `1px solid ${s.id === strain.id ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 2,
                  padding: "20px 20px",
                  cursor: s.id === strain.id ? "default" : "pointer",
                  opacity: s.id === strain.id ? 1 : 0.7,
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    color: s.accentColor,
                    marginBottom: 10,
                  }}
                >
                  {s.icon}
                </div>
                <p
                  className="shop-font"
                  style={{ fontSize: 17, color: "#faf9f6", marginBottom: 4 }}
                >
                  {s.name}
                </p>
                <p
                  className="body-font"
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.eybnaLine.split(" ")[0]} Line
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer
        style={{ background: "#060e09", padding: "48px 40px", marginTop: 48 }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <span
              className="shop-font"
              style={{ fontSize: 20, color: "#faf9f6", letterSpacing: "0.2em" }}
            >
              PROTEA
            </span>
            <span
              className="shop-font"
              style={{ fontSize: 20, color: "#52b788", letterSpacing: "0.2em" }}
            >
              {" "}
              BOTANICALS
            </span>
            <p
              className="body-font"
              style={{
                fontSize: 12,
                color: "#555",
                marginTop: 8,
                fontWeight: 300,
              }}
            >
              Premium Botanical Extracts · South Africa
            </p>
          </div>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              ["Home", "/"],
              ["Scan & Earn", "/scan"],
              ["Shop", "/shop"],
              ["Wholesale", "/wholesale"],
            ].map(([label, path]) => (
              <span
                key={label}
                className="body-font"
                onClick={() => navigate(path)}
                style={{
                  fontSize: 12,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#555",
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#52b788")}
                onMouseLeave={(e) => (e.target.style.color = "#555")}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            maxWidth: 1100,
            margin: "24px auto 0",
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p
            className="body-font"
            style={{ fontSize: 11, color: "#333", fontWeight: 300 }}
          >
            © 2026 Protea Botanicals. Lab testing by Ecogreen Analytics (Pty)
            Ltd, Somerset West. Terpenes by Eybna GmbH, Berlin. This product is
            intended for adult use only. Keep out of reach of children.
          </p>
        </div>
      </footer>
    </div>
  );
}
