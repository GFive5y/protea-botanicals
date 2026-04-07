// src/utils/exportFinancialStatements.js — WP-FINANCIALS Phase 9
// Generates a print-ready HTML financial statement package
// Opens in new tab → Ctrl+P / browser print → Save as PDF

export function exportFinancialStatementsPDF({
  tenantName, vatNumber, financialYear, preparedDate,
  totalRevenue, totalCogs, grossProfit, grossMarginPct,
  totalOpex, depreciationTotal, netProfit, netMarginPct,
  expensesBySubcategory, equityLedger, shareCapital,
  openingRetained, statementStatus,
}) {
  const fmtZar = (n) => {
    const v = parseFloat(n) || 0;
    return `R\u202F${v.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const statusLabel = { draft: "DRAFT", reviewed: "REVIEWED", signed: "SIGNED OFF" };

  const opexRows = Object.entries(expensesBySubcategory || {})
    .sort((a, b) => b[1] - a[1])
    .map(([sub, amt]) => `
      <tr>
        <td style="padding:6px 0;color:#374151;">${sub}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;color:#374151;">${fmtZar(amt)}</td>
        <td style="text-align:right;color:#9CA3AF;">\u2014</td>
      </tr>
    `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Financial Statements \u2014 ${tenantName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; color: #111827; background: #fff; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }
  .page { max-width: 820px; margin: 0 auto; padding: 48px 40px; }
  .letterhead { background: linear-gradient(135deg,#1A3D2B 0%,#2D6A4F 100%); color:#fff; padding:32px 40px; border-radius:0; margin:-48px -40px 40px; }
  .company { font-size:24px; font-weight:700; letter-spacing:-0.02em; margin-bottom:4px; }
  .stat-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; opacity:0.7; margin-bottom:6px; }
  .status-badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:11px; font-weight:700; background:rgba(255,255,255,0.2); color:#fff; letter-spacing:0.06em; }
  .section { margin-bottom:32px; }
  .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6B7280; border-bottom:2px solid #1A3D2B; padding-bottom:6px; margin-bottom:12px; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#6B7280; padding:8px 0; border-bottom:1px solid #E5E7EB; text-align:right; }
  th:first-child { text-align:left; }
  .total-row td { font-weight:700; font-size:14px; border-top:2px solid #E5E7EB; padding-top:10px; }
  .net-profit { background:#ECFDF5; border-radius:8px; padding:16px; display:flex; justify-content:space-between; align-items:center; margin-top:16px; }
  .net-profit.loss { background:#FEF2F2; }
  .footnote { font-size:11px; color:#9CA3AF; line-height:1.6; margin-top:32px; padding-top:16px; border-top:1px solid #E5E7EB; }
  .print-btn { position:fixed; top:20px; right:20px; padding:10px 20px; background:#1A3D2B; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
</style>
</head>
<body>
<button class="no-print print-btn" onclick="window.print()">\uD83D\uDDA8\uFE0F Print / Save PDF</button>
<div class="page">
  <div class="letterhead">
    <div class="stat-title">Statement of Comprehensive Income</div>
    <div class="company">${tenantName || "Business Name"}</div>
    <div style="font-size:13px;opacity:0.8;margin-bottom:12px;">${financialYear} \u00b7 Prepared ${preparedDate}</div>
    <span class="status-badge">${statusLabel[statementStatus] || "DRAFT"}</span>
    ${vatNumber ? `<span style="margin-left:12px;font-size:12px;opacity:0.7;">VAT Reg: ${vatNumber}</span>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Revenue</div>
    <table>
      <thead><tr><th>Description</th><th>Current Period</th><th>Prior Period</th></tr></thead>
      <tbody>
        <tr><td>Revenue from contracts with customers</td><td style="text-align:right;font-variant-numeric:tabular-nums;color:#059669;">${fmtZar(totalRevenue)}</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>
        <tr class="total-row"><td>Total Revenue</td><td style="text-align:right;font-variant-numeric:tabular-nums;color:#059669;">${fmtZar(totalRevenue)}</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Cost of Sales</div>
    <table>
      <thead><tr><th>Description</th><th>Current Period</th><th>Prior Period</th></tr></thead>
      <tbody>
        <tr><td>Cost of inventories recognised as expense (actual)</td><td style="text-align:right;font-variant-numeric:tabular-nums;color:#DC2626;">(${fmtZar(Math.abs(totalCogs))})</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>
        <tr class="total-row"><td>Gross Profit <span style="font-size:11px;font-weight:400;color:#6B7280;">(${(grossMarginPct || 0).toFixed(1)}% margin)</span></td><td style="text-align:right;font-variant-numeric:tabular-nums;color:#059669;">${fmtZar(grossProfit)}</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Operating Expenses</div>
    <table>
      <thead><tr><th>Category</th><th>Current Period</th><th>Prior Period</th></tr></thead>
      <tbody>
        ${opexRows}
        ${depreciationTotal > 0 ? `<tr><td>Depreciation \u2014 PPE</td><td style="text-align:right;font-variant-numeric:tabular-nums;">(${fmtZar(depreciationTotal)})</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>` : ""}
        <tr class="total-row"><td>Total Operating Expenses</td><td style="text-align:right;font-variant-numeric:tabular-nums;color:#DC2626;">(${fmtZar(Math.abs(totalOpex))})</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>
      </tbody>
    </table>
  </div>

  <div class="net-profit${netProfit < 0 ? " loss" : ""}">
    <div>
      <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">${netProfit >= 0 ? "Profit for the Period" : "Loss for the Period"}</div>
      <div style="font-size:28px;font-weight:700;color:${netProfit >= 0 ? "#059669" : "#DC2626"};font-variant-numeric:tabular-nums;">
        ${netProfit < 0 ? "(" : ""}${fmtZar(Math.abs(netProfit))}${netProfit < 0 ? ")" : ""}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;color:#6B7280;margin-bottom:4px;">Net Margin</div>
      <div style="font-size:22px;font-weight:700;color:${(netMarginPct||0) >= 20 ? "#059669" : (netMarginPct||0) >= 10 ? "#D97706" : "#DC2626"};font-variant-numeric:tabular-nums;">${(netMarginPct || 0).toFixed(1)}%</div>
    </div>
  </div>

  ${equityLedger ? `
  <div class="section page-break">
    <div class="section-title">Statement of Changes in Equity</div>
    <table>
      <thead><tr><th>Component</th><th>Current Period</th><th>Prior Period</th></tr></thead>
      <tbody>
        <tr><td>Share capital</td><td style="text-align:right;font-variant-numeric:tabular-nums;">${fmtZar(shareCapital)}</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>
        <tr><td>Retained earnings \u2014 opening</td><td style="text-align:right;font-variant-numeric:tabular-nums;">${fmtZar(openingRetained)}</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>
        <tr><td>Profit / (loss) for the period</td><td style="text-align:right;font-variant-numeric:tabular-nums;color:${netProfit >= 0 ? "#059669" : "#DC2626"};">${fmtZar(netProfit)}</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>
        <tr class="total-row"><td>Total Equity</td><td style="text-align:right;font-variant-numeric:tabular-nums;color:#1A3D2B;">${fmtZar((shareCapital || 0) + (openingRetained || 0) + netProfit)}</td><td style="text-align:right;color:#9CA3AF;">\u2014</td></tr>
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="footnote">
    <strong>Basis of preparation:</strong> Prepared in accordance with IFRS for SMEs. Functional currency: ZAR.
    Status: <strong>${statusLabel[statementStatus] || "DRAFT"}</strong>. System-generated from NuAi accounting data.
    Should be reviewed by a qualified CA(SA) before submission.
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
