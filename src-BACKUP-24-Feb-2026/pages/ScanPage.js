// src/pages/ScanPage.js
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500&display=swap');
  .shop-font { font-family: 'Cormorant Garamond', Georgia, serif; }
  .body-font { font-family: 'Jost', sans-serif; }
  .pb-btn {
    font-family: 'Jost', sans-serif;
    padding: 12px 32px;
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
    padding: 12px 32px;
    background: transparent;
    color: #1b4332;
    border: 1px solid #1b4332;
    border-radius: 2px;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  }
  .pb-btn-outline:hover { background: #1b4332; color: white; }
  .method-card { transition: transform 0.2s, box-shadow 0.2s; }
  .method-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08) !important; }
`;

export default function ScanPage() {
  const [activeMethod, setActiveMethod] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  const startScan = async () => {
    setCameraError("");
    setScanning(true);
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopScan();
          navigate(`/scan/${decodedText}`);
        },
        () => {},
      );
    } catch (e) {
      setCameraError(
        "Camera unavailable on this device/browser. Try Upload or Manual entry below.",
      );
      setScanning(false);
    }
  };

  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");
    setUploadSuccess("Scanning image...");
    try {
      const scanner = new Html5Qrcode("qr-upload-region");
      const result = await scanner.scanFile(file, true);
      setUploadSuccess(`✓ Code found: ${result}`);
      setTimeout(() => navigate(`/scan/${result}`), 800);
    } catch (err) {
      setUploadSuccess("");
      setUploadError("No QR code found in this image. Try a clearer photo.");
    }
    e.target.value = "";
  };

  const handleManual = () => {
    if (manualCode.trim()) navigate(`/scan/${manualCode.trim()}`);
  };

  const METHOD_CARDS = [
    {
      id: "camera",
      icon: "◈",
      title: "Camera Scan",
      desc: "Best on mobile. Point camera at the QR code on your product.",
      badge: "Recommended on Mobile",
      badgeColor: "#2d6a4f",
    },
    {
      id: "upload",
      icon: "△",
      title: "Upload QR Image",
      desc: "Upload a photo of the QR code from your device.",
      badge: "Best for Desktop",
      badgeColor: "#2c4a6e",
    },
    {
      id: "manual",
      icon: "◎",
      title: "Enter Code",
      desc: "Type the code printed on your product label manually.",
      badge: "Universal Fallback",
      badgeColor: "#b5935a",
    },
  ];

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: "#faf9f6",
        minHeight: "100vh",
      }}
    >
      <style>{sharedStyles}</style>

      <div
        style={{
          background: "linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)",
          padding: "64px 40px",
          textAlign: "center",
        }}
      >
        <span
          className="body-font"
          style={{
            fontSize: "11px",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#52b788",
          }}
        >
          QR VERIFICATION
        </span>
        <h1
          className="shop-font"
          style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 300,
            color: "#faf9f6",
            margin: "12px 0",
          }}
        >
          Scan & Earn
        </h1>
        <p
          className="body-font"
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "15px",
            fontWeight: 300,
          }}
        >
          Verify your product and collect loyalty points instantly.
        </p>
      </div>

      <div
        style={{ maxWidth: "680px", margin: "0 auto", padding: "60px 24px" }}
      >
        {!activeMethod && (
          <>
            <p
              className="body-font"
              style={{
                textAlign: "center",
                fontSize: "11px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#aaa",
                marginBottom: "32px",
              }}
            >
              Choose a scan method
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
              }}
            >
              {METHOD_CARDS.map((card) => (
                <div
                  key={card.id}
                  className="method-card"
                  onClick={() => setActiveMethod(card.id)}
                  style={{
                    background: "white",
                    border: "1px solid #e8e0d4",
                    borderRadius: "2px",
                    padding: "32px 24px",
                    textAlign: "center",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                    cursor: "pointer",
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
                      height: "3px",
                      background: card.badgeColor,
                    }}
                  />
                  <div
                    style={{
                      fontSize: "36px",
                      color: card.badgeColor,
                      marginBottom: "16px",
                      marginTop: "8px",
                    }}
                  >
                    {card.icon}
                  </div>
                  <h3
                    className="shop-font"
                    style={{
                      fontSize: "20px",
                      fontWeight: 400,
                      color: "#1a1a1a",
                      marginBottom: "8px",
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className="body-font"
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      fontWeight: 300,
                      lineHeight: 1.6,
                      marginBottom: "16px",
                    }}
                  >
                    {card.desc}
                  </p>
                  <span
                    className="body-font"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      padding: "3px 10px",
                      borderRadius: "2px",
                      background: `${card.badgeColor}18`,
                      color: card.badgeColor,
                      border: `1px solid ${card.badgeColor}33`,
                    }}
                  >
                    {card.badge}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeMethod === "camera" && (
          <div
            style={{
              background: "white",
              border: "1px solid #e8e0d4",
              borderRadius: "2px",
              padding: "40px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "40px",
                color: "#2d6a4f",
                marginBottom: "16px",
              }}
            >
              ◈
            </div>
            <h2
              className="shop-font"
              style={{
                fontSize: "28px",
                fontWeight: 400,
                color: "#1a1a1a",
                marginBottom: "8px",
              }}
            >
              Camera Scan
            </h2>
            <p
              className="body-font"
              style={{
                fontSize: "13px",
                color: "#888",
                fontWeight: 300,
                marginBottom: "28px",
              }}
            >
              Point your camera at the QR code on your product packaging.
            </p>
            {scanning ? (
              <>
                <div
                  id="qr-reader"
                  style={{
                    width: "100%",
                    borderRadius: "2px",
                    border: "2px solid #2d6a4f",
                    marginBottom: "16px",
                    overflow: "hidden",
                  }}
                />
                <button className="pb-btn-outline" onClick={stopScan}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="pb-btn" onClick={startScan}>
                Open Camera
              </button>
            )}
            {cameraError && (
              <div
                style={{
                  background: "#fdecea",
                  border: "1px solid #f5c6c6",
                  borderRadius: "2px",
                  padding: "12px 16px",
                  marginTop: "16px",
                  textAlign: "left",
                }}
              >
                <p
                  className="body-font"
                  style={{ color: "#c0392b", fontSize: "13px" }}
                >
                  {cameraError}
                </p>
              </div>
            )}
            <button
              className="pb-btn-outline"
              style={{ marginTop: "24px", width: "100%" }}
              onClick={() => {
                stopScan();
                setActiveMethod(null);
                setCameraError("");
              }}
            >
              ← Back to Methods
            </button>
          </div>
        )}

        {activeMethod === "upload" && (
          <div
            style={{
              background: "white",
              border: "1px solid #e8e0d4",
              borderRadius: "2px",
              padding: "40px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              textAlign: "center",
            }}
          >
            <div id="qr-upload-region" style={{ display: "none" }} />
            <div
              style={{
                fontSize: "40px",
                color: "#2c4a6e",
                marginBottom: "16px",
              }}
            >
              △
            </div>
            <h2
              className="shop-font"
              style={{
                fontSize: "28px",
                fontWeight: 400,
                color: "#1a1a1a",
                marginBottom: "8px",
              }}
            >
              Upload QR Image
            </h2>
            <p
              className="body-font"
              style={{
                fontSize: "13px",
                color: "#888",
                fontWeight: 300,
                marginBottom: "28px",
              }}
            >
              Select a photo containing the QR code from your device.
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed #e0d8cc",
                borderRadius: "2px",
                padding: "48px 24px",
                marginBottom: "24px",
                cursor: "pointer",
                background: "#faf9f6",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "#2d6a4f")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "#e0d8cc")
              }
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>△</div>
              <p
                className="body-font"
                style={{ fontSize: "13px", color: "#888", fontWeight: 300 }}
              >
                Click to select image, or drag & drop
              </p>
              <p
                className="body-font"
                style={{ fontSize: "11px", color: "#bbb", marginTop: "8px" }}
              >
                JPG, PNG, GIF, WEBP supported
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <button
              className="pb-btn"
              style={{ width: "100%", marginBottom: "12px" }}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Image
            </button>
            {uploadSuccess && (
              <div
                style={{
                  background: "#e8f5e9",
                  border: "1px solid #2d6a4f",
                  borderRadius: "2px",
                  padding: "12px 16px",
                  marginTop: "12px",
                }}
              >
                <p
                  className="body-font"
                  style={{ color: "#2d6a4f", fontSize: "13px" }}
                >
                  {uploadSuccess}
                </p>
              </div>
            )}
            {uploadError && (
              <div
                style={{
                  background: "#fdecea",
                  border: "1px solid #f5c6c6",
                  borderRadius: "2px",
                  padding: "12px 16px",
                  marginTop: "12px",
                }}
              >
                <p
                  className="body-font"
                  style={{ color: "#c0392b", fontSize: "13px" }}
                >
                  {uploadError}
                </p>
              </div>
            )}
            <button
              className="pb-btn-outline"
              style={{ marginTop: "24px", width: "100%" }}
              onClick={() => {
                setActiveMethod(null);
                setUploadError("");
                setUploadSuccess("");
              }}
            >
              ← Back to Methods
            </button>
          </div>
        )}

        {activeMethod === "manual" && (
          <div
            style={{
              background: "white",
              border: "1px solid #e8e0d4",
              borderRadius: "2px",
              padding: "40px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "40px",
                color: "#b5935a",
                marginBottom: "16px",
              }}
            >
              ◎
            </div>
            <h2
              className="shop-font"
              style={{
                fontSize: "28px",
                fontWeight: 400,
                color: "#1a1a1a",
                marginBottom: "8px",
              }}
            >
              Enter Code Manually
            </h2>
            <p
              className="body-font"
              style={{
                fontSize: "13px",
                color: "#888",
                fontWeight: 300,
                marginBottom: "28px",
              }}
            >
              Type the code printed on your product label.
            </p>
            <input
              className="body-font"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManual()}
              placeholder="e.g. PROTEA-XXXX-XXXX"
              style={{
                width: "100%",
                padding: "14px 16px",
                border: "1px solid #ddd",
                borderRadius: "2px",
                fontSize: "14px",
                marginBottom: "16px",
                fontFamily: "'Jost', sans-serif",
                boxSizing: "border-box",
                outline: "none",
                textAlign: "center",
                letterSpacing: "0.05em",
              }}
            />
            <button
              className="pb-btn"
              style={{ width: "100%", marginBottom: "12px" }}
              onClick={handleManual}
            >
              Verify Code
            </button>
            <button
              className="pb-btn-outline"
              style={{ width: "100%", marginTop: "12px" }}
              onClick={() => {
                setActiveMethod(null);
                setManualCode("");
              }}
            >
              ← Back to Methods
            </button>
          </div>
        )}
      </div>

      <footer
        style={{
          background: "#1a1a1a",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#faf9f6", letterSpacing: "0.2em" }}
        >
          PROTEA
        </span>
        <span
          className="shop-font"
          style={{ fontSize: "18px", color: "#52b788", letterSpacing: "0.2em" }}
        >
          {" "}
          BOTANICALS
        </span>
        <p
          className="body-font"
          onClick={() => navigate("/")}
          style={{
            fontSize: "11px",
            color: "#555",
            marginTop: "12px",
            cursor: "pointer",
          }}
        >
          ← Back to Home
        </p>
      </footer>
    </div>
  );
}
