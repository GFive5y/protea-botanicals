-- S318 Capstone-003: archive S309 migration backup table
-- Created: S309 (18 April 2026, commit for 2B.2 backfill + NOT NULL)
-- Purpose at creation: recovery evidence for 3 tables (inventory_items,
--   stock_movements, loyalty_transactions) cleaned and constrained
-- Retention verified:
--   * S309 migration landed 18 April 2026
--   * S312 (SAFETY-082b) relied on same pattern, its backup already retained separately
--   * S313.5 (supplier migration) relied on same pattern, separate backup
--   * All three migrations confirmed stable for >2 weeks (as of S317 close)
--   * Zero code references to _migration_backup_s309 (grep-before-drop clean)
--   * Zero DB-level dependencies (no views, no FKs)
-- Decision: archive. If re-investigation ever needed, the 174 rows were
--   documented in S309 close notes and decision journal.

-- Pre-drop census (informational, runs in same transaction):
DO $$
DECLARE
  row_count integer;
BEGIN
  SELECT COUNT(*) INTO row_count FROM _migration_backup_s309;
  RAISE NOTICE 'S309 backup table row count at drop: %', row_count;
  -- Expected: 174
END $$;

DROP TABLE _migration_backup_s309;
