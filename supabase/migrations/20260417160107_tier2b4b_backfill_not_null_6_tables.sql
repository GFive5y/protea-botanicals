-- Tier 2 Workstream B.4b — Backfill + NOT NULL on 6 tenant-scoped tables
-- Session 312, 18 April 2026. Closes SAFETY-082b.
--
-- Data changes applied via Supabase MCP in 7 phases:
--   Phase 0: Backup to _migration_backup_s312 (23 rows)
--   Phase 1: Deleted 4 junk notification_log rows (fake phone +2700000)
--   Phase 2: Backfilled 7 customer_messages (4→Pure Premium, 3→HQ) via user_profiles
--   Phase 3: Backfilled 3 notification_log → HQ (phone owner = HQ admin)
--   Phase 4: Backfilled 2 products → Pure Premium via batches.tenant_id
--   Phase 5: Backfilled 4 production_runs → Pure Premium via batches.tenant_id
--   Phase 6: Backfilled 2 scans + 1 support_ticket → HQ via user_profiles
--
-- Attribution verified at each phase: no drift from S311.75 evidence.
-- This migration records the DDL constraints only.

ALTER TABLE public.customer_messages ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.notification_log  ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.products          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.production_runs   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.scans             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.support_tickets   ALTER COLUMN tenant_id SET NOT NULL;
