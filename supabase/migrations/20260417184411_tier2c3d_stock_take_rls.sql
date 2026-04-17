-- Tier 2C.3d — Stock_take legacy RLS migration (S314.3d)
-- Migrates 3 tables from current_setting('app.tenant_id') pattern
-- to standard user_tenant_id() + user_role() + HQ bypass pattern.
-- Zero rows in all tables. Feature is unimplemented. Pure consistency.

-- Drop legacy policies
DROP POLICY IF EXISTS "tenant_sts_all" ON stock_take_sessions;
DROP POLICY IF EXISTS "tenant_stsch_all" ON stock_take_schedules;
DROP POLICY IF EXISTS "tenant_sti_all" ON stock_take_items;

-- Tenant-admin policies
CREATE POLICY "admin_stock_take_sessions_all" ON stock_take_sessions FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

CREATE POLICY "admin_stock_take_schedules_all" ON stock_take_schedules FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

CREATE POLICY "admin_stock_take_items_all" ON stock_take_items FOR ALL
  USING (session_id IN (
    SELECT id FROM stock_take_sessions
    WHERE tenant_id = user_tenant_id() AND user_role() = 'admin'))
  WITH CHECK (session_id IN (
    SELECT id FROM stock_take_sessions
    WHERE tenant_id = user_tenant_id() AND user_role() = 'admin'));

-- HQ bypass policies
CREATE POLICY "hq_all_stock_take_sessions" ON stock_take_sessions FOR ALL
  USING (is_hq_user()) WITH CHECK (is_hq_user());
CREATE POLICY "hq_all_stock_take_schedules" ON stock_take_schedules FOR ALL
  USING (is_hq_user()) WITH CHECK (is_hq_user());
CREATE POLICY "hq_all_stock_take_items" ON stock_take_items FOR ALL
  USING (is_hq_user()) WITH CHECK (is_hq_user());
