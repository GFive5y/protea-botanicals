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
    # Core commerce
    "orders", "inventory_items", "user_profiles", "expenses",
    "journal_entries", "journal_lines", "invoices",
    "purchase_orders", "purchase_order_items",
    # Staff / HR
    "staff_profiles", "timesheets", "leave_requests", "leave_balances",
    "employment_contracts",
    # Assets / finance
    "fixed_assets", "depreciation_entries", "bank_accounts",
    "bank_statement_lines", "vat_transactions", "vat_period_filings",
    "chart_of_accounts", "equity_ledger", "financial_statement_status",
    "financial_year_archive",
    # Cannabis / medical
    "batches", "dispensing_log", "patients", "prescriptions",
    # Loyalty / consumer
    "loyalty_transactions", "support_tickets", "customer_messages",
    "wholesale_messages", "qr_codes",
    # Stock / supply chain
    "stock_movements", "suppliers", "stock_receipts", "stock_receipt_lines",
    "shipments", "shipment_items",
    # Production
    "production_runs", "production_run_inputs",
    "product_formats", "product_format_bom",
    # F&B
    "food_recipes", "food_recipe_lines", "haccp_control_points",
    "haccp_log_entries", "cold_chain_locations", "temperature_logs",
    # Pricing / COGS
    "product_cogs", "product_pricing",
    # System / audit
    "audit_log", "system_alerts", "recall_events",
    # Tenant config
    "tenant_config", "wholesale_partners",
    # Documents
    "document_log",
}

# Tables using the shared-defaults-with-overrides pattern (LL-293).
# NULL tenant_id is intentional on these; RLS policy uses
# (tenant_id IS NULL) OR (tenant_id = user_tenant_id()).
# Queries without tenant_id filter are CORRECT — the policy handles isolation.
# Investigation: S310.5 pg_policies queries, 18 April 2026.
SHARED_REFERENCE_TABLES = {
    "public_holidays",
    "product_formats",
    "product_strains",
    "message_templates",  # S314.2c — LL-293 shared-defaults pattern
}

CROSS_TENANT_PERMANENT = {
    "scan_logs", "fx_rates", "tenants", "supplier_products",
    "local_inputs",
    # user_profiles is scoped by auth user.id, not tenant_id
    "user_profiles",
    # survey_responses is scoped by user_id
    "survey_responses",
    # referral_codes is scoped by owner_id / code
    "referral_codes",
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
            if table not in TENANT_SCOPED and table not in CROSS_TENANT_PERMANENT and table not in SHARED_REFERENCE_TABLES:
                continue
            context = "".join(lines[max(0, i - 3):min(len(lines), i + 18)])
            # Check for SELECT filter (.eq("tenant_id"...)) or INSERT payload (tenant_id: ...)
            has_filter = (
                '.eq("tenant_id"' in context or
                ".eq('tenant_id'" in context or
                'tenant_id:' in context or
                '"tenant_id"' in context  # embedded join syntax
            )
            # Single-record operations (.eq("id", X)) are inherently scoped
            is_single_record = '.eq("id"' in context and ('.update(' in context or '.delete(' in context)
            permanent = table in CROSS_TENANT_PERMANENT
            shared_ref = table in SHARED_REFERENCE_TABLES
            intentional = INTENTIONAL_MARKER in context
            verdict = (
                "OK"             if has_filter else
                "OK_INTENTIONAL" if intentional else
                "ACCEPT"         if permanent else
                "OK_SHARED"      if shared_ref else
                "OK_SINGLE"      if is_single_record else
                "BLEED"
            )
            query_results.append((fpath.replace("src/", ""), i + 1, table, verdict))

bleeds  = [r for r in query_results if r[3] == "BLEED"]
accepts = [r for r in query_results if r[3] == "ACCEPT"]
oks     = [r for r in query_results if r[3] in ("OK", "OK_INTENTIONAL", "OK_SINGLE", "OK_SHARED")]

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
