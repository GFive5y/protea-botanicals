-- Tier 2 Workstream B.2 — Partial-NULL cleanup + NOT NULL constraints
-- Session 309, 18 April 2026
--
-- Data changes applied via Supabase MCP in 5 phases:
--   Phase 0: Backup to _migration_backup_s309 (174 rows)
--   Phase 1: Deleted 5 junk inventory_items (FP-test, FP-ert45, FP-drink-test,
--            FP-gummy-, FP-espressoo) + cascading dependents (4 batches,
--            4 production_runs, 1 qr_code, 2 purchase_orders, 2 purchase_order_items,
--            1 stock_reservation, ~6 stock_movements)
--   Phase 2: Backfilled 16 real inventory_items to Pure Premium THC Vapes
--            (f8ff8d07-7688-44a7-8714-5941ab4ceaa5) — evidence-backed attribution
--   Phase 3: Backfilled 146 stock_movements from parent inventory_items.tenant_id
--   Phase 4: Backfilled 1 loyalty_transaction to Pure Premium (order cross-verified)
--
-- This migration file records the DDL constraint changes only.
-- Data changes were applied directly via MCP before this migration.

ALTER TABLE public.inventory_items      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.stock_movements      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.loyalty_transactions ALTER COLUMN tenant_id SET NOT NULL;
