// src/pages/ScanResult.js
export default function ScanResult() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
      <div
        style={{ background: "#d4edda", padding: "40px", borderRadius: "16px" }}
      >
        <h1 style={{ color: "green", textAlign: "center" }}>
          ✅ Authentic Product
        </h1>

        <h2>Protea Botanicals Premium Extract</h2>
        <p>
          <strong>Batch Number:</strong> PB-001-2026
        </p>
        <p>
          <strong>Lab Certified:</strong> Yes
        </p>
        <p>
          <strong>THC Content:</strong> 92.3%
        </p>
        <p>
          <strong>CBD Content:</strong> 0.2%
        </p>
        <p>
          <strong>Organic:</strong> Yes
        </p>
        <p>
          <strong>Production Date:</strong> 2026-01-15
        </p>
        <p>
          <strong>Expiry Date:</strong> 2027-01-15
        </p>

        {/* COA SECTION - as per SOW transparency requirement */}
        <div
          style={{
            marginTop: "50px",
            textAlign: "center",
            padding: "30px",
            background: "white",
            borderRadius: "12px",
          }}
        >
          <h3>Certificate of Analysis (COA)</h3>
          <a
            href="https://example.com/coa/PB-001-2026.pdf"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "16px 40px",
              background: "#61dafb",
              color: "#000",
              fontSize: "1.2rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
              marginTop: "15px",
            }}
          >
            📄 View Full COA (PDF)
          </a>
        </div>
      </div>
    </div>
  );
}
