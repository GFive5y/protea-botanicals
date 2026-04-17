-- Tier 2 Workstream B.3 — Drop broken self-referencing views
-- SAFETY-081: retailer_performance and scan_geo_summary have been
-- non-queryable since creation due to self-referencing definitions
-- (SELECT FROM same_view_name → infinite recursion).
-- No underlying tables exist. No DB objects depend on them.
-- GeoAnalyticsDashboard.js L485 references retailer_performance but
-- the query always failed (empty array fallback, same behaviour post-drop).
-- Investigation: S309.5 Supabase MCP + S310 grep + pg_depend check.

DROP VIEW IF EXISTS public.retailer_performance CASCADE;
DROP VIEW IF EXISTS public.scan_geo_summary CASCADE;
