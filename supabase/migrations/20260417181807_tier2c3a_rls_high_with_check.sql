-- Tier 2C Stage 3a — HIGH with_check fixes on tenant-scoped policies (S314.3a)
-- Mechanical fix: copy using_clause to with_check on 11 policies.
-- Closes defense-in-depth gap where INSERT/UPDATE could bypass tenant_id check.
--
-- Pattern 1 (9 policies): user_tenant_id() + user_role() = 'admin'
-- Pattern 2 (2 policies): current_user_tenant_id() + is_admin_user() — alternate fn names
-- Pattern 3 (3 policies): stock_take_* legacy current_setting() — NOT IN SCOPE, deferred

-- Pattern 1: Standard tenant-admin policies
DROP POLICY IF EXISTS "admin_timesheets_all" ON timesheets;
CREATE POLICY "admin_timesheets_all" ON timesheets FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

DROP POLICY IF EXISTS "admin_ts_entries_all" ON timesheet_entries;
CREATE POLICY "admin_ts_entries_all" ON timesheet_entries FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

DROP POLICY IF EXISTS "admin_leave_requests_all" ON leave_requests;
CREATE POLICY "admin_leave_requests_all" ON leave_requests FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

DROP POLICY IF EXISTS "admin_reviews_all" ON performance_reviews;
CREATE POLICY "admin_reviews_all" ON performance_reviews FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

DROP POLICY IF EXISTS "admin_shifts_all" ON shift_schedules;
CREATE POLICY "admin_shifts_all" ON shift_schedules FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

DROP POLICY IF EXISTS "admin_messages_all" ON staff_messages;
CREATE POLICY "admin_messages_all" ON staff_messages FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

DROP POLICY IF EXISTS "admin_notifs_all" ON staff_notifications;
CREATE POLICY "admin_notifs_all" ON staff_notifications FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

DROP POLICY IF EXISTS "admin_travel_all" ON travel_allowances;
CREATE POLICY "admin_travel_all" ON travel_allowances FOR ALL
  USING ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'))
  WITH CHECK ((tenant_id = user_tenant_id()) AND (user_role() = 'admin'));

DROP POLICY IF EXISTS "admin_tenant_isolation" ON system_alerts;
CREATE POLICY "admin_tenant_isolation" ON system_alerts FOR ALL
  USING (tenant_id = user_tenant_id())
  WITH CHECK (tenant_id = user_tenant_id());

-- Pattern 2: Alternate function names (disciplinary_records, employment_contracts)
DROP POLICY IF EXISTS "dr_admin_update" ON disciplinary_records;
CREATE POLICY "dr_admin_update" ON disciplinary_records FOR UPDATE
  USING ((tenant_id = current_user_tenant_id()) AND is_admin_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_admin_user());

DROP POLICY IF EXISTS "ec_admin_update" ON employment_contracts;
CREATE POLICY "ec_admin_update" ON employment_contracts FOR UPDATE
  USING ((tenant_id = current_user_tenant_id()) AND is_admin_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_admin_user());
