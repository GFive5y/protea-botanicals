import { useState, useEffect } from "react";
import { useTenant } from "../../services/tenantService";
import { supabase } from "../../services/supabaseClient";
import { T } from "../../styles/tokens";

const ORDER = ["asset", "liability", "equity", "revenue", "expense"];

export default function HQChartOfAccounts() {
  const { tenantId } = useTenant();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from("chart_of_accounts")
      .select("account_code,account_name,account_type,account_subtype,is_active")
      .eq("tenant_id", tenantId)
      .order("account_code")
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, [tenantId]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#888", fontFamily: T.font }}>Loading...</div>;
  if (!rows.length) return <div style={{ padding: 40, textAlign: "center", color: "#888", fontFamily: T.font }}>No chart of accounts for this tenant.</div>;

  const groups = {};
  rows.forEach(r => { const t = r.account_type || "other"; if (!groups[t]) groups[t] = []; groups[t].push(r); });
  const sorted = ORDER.filter(t => groups[t]).concat(Object.keys(groups).filter(t => !ORDER.includes(t)));

  return (
    <div style={{ fontFamily: T.font }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Chart of Accounts ({rows.length} accounts)</h3>
      {sorted.map(type => (
        <div key={type} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: T.ink500, padding: "6px 0", borderBottom: `2px solid ${T.border}`, marginBottom: 4 }}>
            {type}s ({groups[type].length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <tbody>{groups[type].map(r => (
              <tr key={r.account_code} style={{ borderBottom: `1px solid ${T.border}`, opacity: r.is_active ? 1 : 0.4 }}>
                <td style={{ padding: "5px 12px", width: 80, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{r.account_code}</td>
                <td style={{ padding: "5px 12px" }}>{r.account_name}</td>
                <td style={{ padding: "5px 12px", color: T.ink500, width: 140 }}>{r.account_subtype || "\u2014"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
