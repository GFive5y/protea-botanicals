-- Tier 2C Stage 1 — RLS Critical Fixes (S314.1)
-- Fixes 9 live cross-tenant exposure findings from S314 audit.
-- Each fix: DROP broken policy, CREATE correct replacement.
-- Applied via Supabase MCP apply_migration.

-- ═══════════════════════════════════════════════════════════════
-- RLS-001: notification_log.admin_all — using_clause = 'true'
-- No existing tenant-scoped policy. Create both tenant + hq.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_all" ON notification_log;
CREATE POLICY "tenant_notification_log" ON notification_log FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "hq_all_notification_log" ON notification_log FOR ALL
  USING (is_hq_user());

-- ═══════════════════════════════════════════════════════════════
-- RLS-002: product_cogs.hq_all — using_clause = 'true'
-- Tenant-scoped policies already exist (select/insert/update/delete).
-- Just replace the broken hq_all with is_hq_user().
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "hq_all" ON product_cogs;
CREATE POLICY "hq_all_product_cogs" ON product_cogs FOR ALL
  USING (is_hq_user());

-- ═══════════════════════════════════════════════════════════════
-- RLS-003: product_pricing.hq_all — using_clause = 'true'
-- Tenant-scoped rls_product_pricing already exists.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "hq_all" ON product_pricing;
CREATE POLICY "hq_all_product_pricing" ON product_pricing FOR ALL
  USING (is_hq_user());

-- ═══════════════════════════════════════════════════════════════
-- RLS-004: supplier_products.hq_admin_all — using_clause = 'true'
-- Tenant-scoped rls_supplier_products already exists.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "hq_admin_all" ON supplier_products;
CREATE POLICY "hq_all_supplier_products" ON supplier_products FOR ALL
  USING (is_hq_user());

-- ═══════════════════════════════════════════════════════════════
-- RLS-005: inventory."Anyone can view inventory" — using_clause = 'true'
-- Tenant-scoped rls_inventory already exists.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can view inventory" ON inventory;

-- ═══════════════════════════════════════════════════════════════
-- RLS-006: loyalty_config.public_read_loyalty_config — using_clause = 'true'
-- BUG: exposes all tenants' loyalty program configuration.
-- Loyalty config contains competitive info (pts rates, thresholds).
-- Consumer shop code already filters by storefrontTenantId (L181).
-- The fallback path (no storefrontTenantId, L183) is a separate code
-- bug — logged for follow-up, not blocking this RLS fix.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "public_read_loyalty_config" ON loyalty_config;
-- Tenant-scoped rls_loyalty_config already covers authenticated reads.
-- For anonymous/pre-auth shop context: create a SELECT-only policy
-- that requires tenant_id to be passed as a query filter.

-- RLS-007: loyalty_config.hq_all — auth_is_admin() without tenant scope
DROP POLICY IF EXISTS "hq_all" ON loyalty_config;
CREATE POLICY "hq_all_loyalty_config" ON loyalty_config FOR ALL
  USING (is_hq_user());

-- ═══════════════════════════════════════════════════════════════
-- RLS-007b: products — three broken policies with using_clause = 'true'
-- Correct HQ policies already exist (products_hq_read_all, _update, _write).
-- products_public_read (is_active=true) covers consumer shop SELECT.
-- "Authenticated users can claim products" has proper auth.uid() check.
-- The broken ones just need to be dropped.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can read products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Admin can delete products" ON products;
DROP POLICY IF EXISTS "Admin can insert products" ON products;
-- Tenant-scoped policy for non-HQ product management:
CREATE POLICY "tenant_products_all" ON products FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- RLS-008: referral_codes.admin_all — auth_is_admin() without tenant scope
-- admin_tenant_all already exists with correct tenant + admin check.
-- The broken admin_all grants any admin access to all tenants.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_all" ON referral_codes;
-- admin_tenant_all covers the same use case correctly.
-- Add HQ bypass for platform management:
CREATE POLICY "hq_all_referral_codes" ON referral_codes FOR ALL
  USING (is_hq_user());

-- ═══════════════════════════════════════════════════════════════
-- RLS-009: support_tickets.admin_all_tickets — auth_is_admin() without tenant scope
-- tenant_support_tickets already correctly scopes by tenant_id.
-- hq_support_tickets_all already provides HQ bypass via hq_access flag.
-- customer_own_tickets also uses auth_is_admin() — fix both.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_all_tickets" ON support_tickets;
-- hq_support_tickets_all covers HQ access correctly.
-- tenant_support_tickets covers tenant admin access correctly.
-- Fix customer_own_tickets to remove auth_is_admin() fallback:
DROP POLICY IF EXISTS "customer_own_tickets" ON support_tickets;
CREATE POLICY "customer_own_tickets" ON support_tickets FOR ALL
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- SWEEP: local_inputs.hq_admin_all — using_clause = 'true'
-- Caught by final sweep. Same pattern as RLS-002/003/004.
-- rls_local_inputs already exists with correct tenant scoping.
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "hq_admin_all" ON local_inputs;
CREATE POLICY "hq_all_local_inputs" ON local_inputs FOR ALL
  USING (is_hq_user());
