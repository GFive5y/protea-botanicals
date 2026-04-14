#!/usr/bin/env python3
"""
update_ground_truth.py
Run at the end of every session to regenerate SYSTEM-GROUND-TRUTH.md
Usage: python3 docs/update_ground_truth.py
Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY in environment or .env

Note: This is a stub. Full implementation requires supabase-py client.
For now, the ground truth is generated via Claude Code using MCP Supabase
queries and written directly. This script documents the queries and format
so any agent can regenerate the file.
"""

import os
from datetime import date

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://uvicrqapgzcdvozxrreo.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

TENANT_ROSTER_SQL = """
SELECT t.id, t.name, t.industry_profile, t.is_active,
  tc.financial_setup_complete, tc.tier, tc.vat_number,
  tc.trading_name, tc.financial_year_start,
  CASE WHEN tc.vat_number ILIKE '%@%' THEN 'VAT# IS EMAIL' END AS vat_bug,
  el.share_capital, el.net_profit_for_year,
  (SELECT COUNT(*) FROM chart_of_accounts c WHERE c.tenant_id = t.id) AS coa_rows,
  (SELECT COUNT(*) FROM orders o WHERE o.tenant_id=t.id AND o.status='paid') AS paid_orders,
  (SELECT ROUND(SUM(total)::numeric,0) FROM orders o WHERE o.tenant_id=t.id AND o.status='paid') AS revenue_zar,
  (SELECT MAX(created_at)::date FROM orders o WHERE o.tenant_id=t.id AND o.status='paid') AS last_order,
  (SELECT STRING_AGG(up.email,', ') FROM user_profiles up WHERE up.tenant_id=t.id AND up.role='admin') AS admin_emails
FROM tenants t
LEFT JOIN tenant_config tc ON tc.tenant_id=t.id
LEFT JOIN equity_ledger el ON el.tenant_id=t.id
WHERE t.industry_profile != 'operator'
ORDER BY t.is_active DESC, paid_orders DESC NULLS LAST;
"""

FINANCIAL_BASELINE_SQL = """
SELECT tenant_financial_period(
  '{tenant_id}'::uuid,
  now() - interval '30 days',
  now()
);
"""

if __name__ == '__main__':
    if not SUPABASE_KEY:
        print("update_ground_truth.py")
        print("=" * 60)
        print("SUPABASE_SERVICE_KEY not set in environment.")
        print("")
        print("To regenerate SYSTEM-GROUND-TRUTH.md:")
        print("  1. Run the TENANT_ROSTER_SQL query above in Supabase Studio")
        print("  2. Run tenant_financial_period for each active tenant")
        print("  3. Update docs/SYSTEM-GROUND-TRUTH.md with results")
        print("")
        print("Or use Claude Code with Supabase MCP to query and write directly.")
        print("")
        print(f"Last generated: check docs/SYSTEM-GROUND-TRUTH.md header")
    else:
        print("supabase-py client implementation pending")
        print("Use Claude Code + Supabase MCP for now")
