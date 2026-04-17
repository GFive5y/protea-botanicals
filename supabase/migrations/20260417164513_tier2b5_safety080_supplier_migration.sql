-- Tier 2 Workstream B.5 — SAFETY-080 Supplier Tenancy Migration
-- Session 313.5, 18 April 2026. Closes SAFETY-080.
--
-- Data changes applied via Supabase MCP in 7 phases:
--   Phase 0: Backup to _migration_backup_s313_5 (9 suppliers + 8 docs + 123 supplier_products)
--   Phase 1: Moved 4 HQ suppliers (Eybna, Steamups, Ecogreen, Cannalytics) → Pure Premium
--   Phase 2: Moved mis-attributed document_log rows → Pure Premium (matching supplier tenant)
--   Phase 3: Moved 123 supplier_products → Pure Premium (matching supplier tenant)
--   Phase 4: Moved Facility A → Medi Rec (FK evidence from stock_receipts; could not delete)
--   Phase 5: Backfilled 4 NULL Metro Hardware suppliers → Metro Hardware tenant
--
-- Final distribution: Pure Premium 4, Metro Hardware 4, Medi Rec 1
-- Zero cross-tenant references. Zero NULL tenant_id.
-- This migration records the DDL constraint only.

ALTER TABLE public.suppliers ALTER COLUMN tenant_id SET NOT NULL;
