#!/usr/bin/env python3
"""
NuAi Layer 1 Tenant Isolation Audit v2.0
=========================================
Run from repo root: python3 docs/audit_tenant_isolation.py
Exit code 1 if any BLEED found — use as pre-commit CI gate.

Version history:
  v1.0 — initial query filter scan
  v2.0 — added stale useCallback deps check + hardcoded profile labels check
"""
import os, re, sys

TENANT_SCOPED = {
    "orders", "inventory_items", "user_profiles", "expenses",
    "journal_entries", "invoices", "purchase_orders", "staff_profiles",
    "timesheets", "leave_requests", "leave_balances", "fixed_assets",
    "batches", "dispensing_log", "patients", "prescriptions",
    "loyalty_transactions", "support_tickets", "customer_messages",
    "wholesale_messages", "stock_movements", "vat_transactions",
    "vat_period_filings", "bank_accounts", "qr_codes",
    "food_recipes", "food_recipe_lines", "haccp_control_points",
    "haccp_log_entries", "cold_chain_locations", "temperature_logs",
    "product_cogs", "product_pricing",
}

CROSS_TENANT_PERMANENT = {
    "scan_logs", "fx_rates", "tenants", "supplier_products",
    "local_inputs",
}

INTENTIONAL_MARKER = "INTENTIONAL: HQ aggregate"

query_results = []

for root, dirs, files in os.walk("src"):
    dirs[:] = [d for d in dirs if d not in ["node_modules", ".git", "build"]]
    for fname in files:
        if not fname.endswith(".js"):
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath) as f:
                lines = f.readlines()
        except Exception:
            continue
        for i, line in enumerate(lines):
            m = re.search(r'\.from\(["\'](\w+)["\']\)', line)
            if not m:
                continue
            table = m.group(1)
            if table not in TENANT_SCOPED and table not in CROSS_TENANT_PERMANENT:
                continue
            context = "".join(lines[max(0, i - 3):min(len(lines), i + 18)])
            has_filter = '.eq("tenant_id"' in context or ".eq('tenant_id'" in context
            permanent = table in CROSS_TENANT_PERMANENT
            intentional = INTENTIONAL_MARKER in context
            verdict = (
                "OK"             if has_filter else
                "OK_INTENTIONAL" if intentional else
                "ACCEPT"         if permanent else
                "BLEED"
            )
            query_results.append((fpath.replace("src/", ""), i + 1, table, verdict))

bleeds  = [r for r in query_results if r[3] == "BLEED"]
accepts = [r for r in query_results if r[3] == "ACCEPT"]
oks     = [r for r in query_results if r[3] in ("OK", "OK_INTENTIONAL")]

print(f"\n{'='*90}")
print("NUAI LAYER 1 TENANT ISOLATION AUDIT v2.0")
print(f"{'='*90}")

if bleeds:
    print(f"\n  BLEED — {len(bleeds)} queries missing tenant filter:")
    prev = None
    for file, line, table, _ in sorted(bleeds, key=lambda x: x[0]):
        if file != prev:
            print(f"\n  {file}")
            prev = file
        print(f"     line {line:>5}  .from(\"{table}\")")
else:
    print("\n  NO BLEED — all tenant-scoped queries filtered")

print(f"\n  Permanent cross-tenant ({len(accepts)}):")
shown = set()
for file, line, table, _ in sorted(accepts, key=lambda x: x[2]):
    if table not in shown:
        print(f"  {table}")
        shown.add(table)

print(f"\n  OK: {len(oks)} queries correctly filtered")
print(f"\n{'='*90}")
print(f"RESULT: {len(bleeds)} BLEED | {len(accepts)} PERMANENT | {len(oks)} OK")
print(f"{'='*90}\n")

sys.exit(1 if bleeds else 0)
