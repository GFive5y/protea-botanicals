-- Tier 2C.3b — HR cluster with_check fixes (S314.3b)
-- 24 HR policies with missing with_check across 15 tables.
-- All already tenant-scoped; mechanical copy of using_clause to with_check.
-- Zero live HR users (role='hr') — pure hardening, zero breakage risk.
--
-- Pattern 1 (14): user_tenant_id() + is_hr_user()
-- Pattern 2 (9): current_user_tenant_id() + is_hr_user() (alternate fn names)
-- Pattern 4a: public_holidays.hr_holidays_all — LL-293, with_check added
-- Pattern 4b: leave_types.lt_tenant_read — SELECT-only, no change needed
-- Applied via Supabase MCP apply_migration.

-- Pattern 1: user_tenant_id()
DROP POLICY IF EXISTS "hr_disciplinary_all" ON disciplinary_records;
CREATE POLICY "hr_disciplinary_all" ON disciplinary_records FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_contracts_all" ON employment_contracts;
CREATE POLICY "hr_contracts_all" ON employment_contracts FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_balances_all" ON leave_balances;
CREATE POLICY "hr_balances_all" ON leave_balances FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_leave_requests_all" ON leave_requests;
CREATE POLICY "hr_leave_requests_all" ON leave_requests FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_leave_types_all" ON leave_types;
CREATE POLICY "hr_leave_types_all" ON leave_types FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_loans_all" ON loans_stipends;
CREATE POLICY "hr_loans_all" ON loans_stipends FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_reviews_all" ON performance_reviews;
CREATE POLICY "hr_reviews_all" ON performance_reviews FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_shifts_all" ON shift_schedules;
CREATE POLICY "hr_shifts_all" ON shift_schedules FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_docs_all" ON staff_documents;
CREATE POLICY "hr_docs_all" ON staff_documents FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_messages_all" ON staff_messages;
CREATE POLICY "hr_messages_all" ON staff_messages FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_notifs_all" ON staff_notifications;
CREATE POLICY "hr_notifs_all" ON staff_notifications FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_ts_entries_all" ON timesheet_entries;
CREATE POLICY "hr_ts_entries_all" ON timesheet_entries FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_timesheets_all" ON timesheets;
CREATE POLICY "hr_timesheets_all" ON timesheets FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_travel_all" ON travel_allowances;
CREATE POLICY "hr_travel_all" ON travel_allowances FOR ALL
  USING ((tenant_id = user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = user_tenant_id()) AND is_hr_user());

-- Pattern 2: current_user_tenant_id() (alternate fn names)
DROP POLICY IF EXISTS "dr_hr_all" ON disciplinary_records;
CREATE POLICY "dr_hr_all" ON disciplinary_records FOR ALL
  USING ((tenant_id = current_user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "ec_hr_all" ON employment_contracts;
CREATE POLICY "ec_hr_all" ON employment_contracts FOR ALL
  USING ((tenant_id = current_user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "lb_hr_all" ON leave_balances;
CREATE POLICY "lb_hr_all" ON leave_balances FOR ALL
  USING ((tenant_id = current_user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "lr_hr_all" ON leave_requests;
CREATE POLICY "lr_hr_all" ON leave_requests FOR ALL
  USING ((tenant_id = current_user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "lt_hr_all" ON leave_types;
CREATE POLICY "lt_hr_all" ON leave_types FOR ALL
  USING ((tenant_id = current_user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "sm_hr_all" ON staff_messages;
CREATE POLICY "sm_hr_all" ON staff_messages FOR ALL
  USING ((tenant_id = current_user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "hr_all" ON staff_profiles;
CREATE POLICY "hr_all" ON staff_profiles FOR ALL
  USING ((tenant_id = current_user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "te_hr_all" ON timesheet_entries;
CREATE POLICY "te_hr_all" ON timesheet_entries FOR ALL
  USING ((tenant_id = current_user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_hr_user());

DROP POLICY IF EXISTS "ts_hr_all" ON timesheets;
CREATE POLICY "ts_hr_all" ON timesheets FOR ALL
  USING ((tenant_id = current_user_tenant_id()) AND is_hr_user())
  WITH CHECK ((tenant_id = current_user_tenant_id()) AND is_hr_user());

-- Pattern 4a: public_holidays (LL-293 shared-defaults + HR role)
DROP POLICY IF EXISTS "hr_holidays_all" ON public_holidays;
CREATE POLICY "hr_holidays_all" ON public_holidays FOR ALL
  USING (((tenant_id = user_tenant_id()) OR (tenant_id IS NULL)) AND is_hr_user())
  WITH CHECK (((tenant_id = user_tenant_id()) OR (tenant_id IS NULL)) AND is_hr_user());

-- Pattern 4b: leave_types.lt_tenant_read — SELECT-only, no with_check needed.
-- Census confirmed all rows have non-NULL tenant_id. NULL clause is
-- forward-compatible safety net. No change. Classified as ACCEPTABLE.
