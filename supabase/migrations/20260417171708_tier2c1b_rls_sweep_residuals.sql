-- Tier 2C Stage 1b — RLS Critical Sweep Residuals (S314.2a)
-- Fixes 10 residual 'true'-clause policies from S314.1 post-fix sweep.
-- WATCH-007 validated: audit under-counted Bucket A by ~17%.

-- RLS-010: batches — 3 broken policies (SELECT/INSERT/UPDATE all 'true')
-- Correct HQ policies already exist (batches_hq_read_all, batches_hq_write).
DROP POLICY IF EXISTS "Public can read batches" ON batches;
DROP POLICY IF EXISTS "Authenticated can insert batches" ON batches;
DROP POLICY IF EXISTS "Authenticated can update batches" ON batches;
CREATE POLICY "tenant_batches_all" ON batches FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- RLS-011: document_log.hq_admin_all — 'true' duplicate of correct hq_all_document_log
DROP POLICY IF EXISTS "hq_admin_all" ON document_log;
CREATE POLICY "tenant_document_log" ON document_log FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- RLS-012: qr_codes — write policy broken, read is DESIGN (LL-295)
-- public_read_qr (SELECT, true) = INTENTIONAL. Public QR scanning is a feature.
--   PRESERVED — not dropped. LL-295 documents this as design.
-- admin_write_qr (ALL, true) = BUG. Cross-tenant QR forgery.
DROP POLICY IF EXISTS "admin_write_qr" ON qr_codes;
CREATE POLICY "tenant_qr_codes_all" ON qr_codes FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "hq_all_qr_codes" ON qr_codes FOR ALL
  USING (is_hq_user());

-- RLS-013: qr_security_settings — 2 duplicate 'true' policies
DROP POLICY IF EXISTS "app_access" ON qr_security_settings;
DROP POLICY IF EXISTS "app_access_qr_security_settings" ON qr_security_settings;
CREATE POLICY "tenant_qr_security_settings" ON qr_security_settings FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "hq_all_qr_security_settings" ON qr_security_settings FOR ALL
  USING (is_hq_user());

-- RLS-014: stock_receipts — 2 duplicate 'true' policies
DROP POLICY IF EXISTS "app_access" ON stock_receipts;
DROP POLICY IF EXISTS "app_access_stock_receipts" ON stock_receipts;
CREATE POLICY "tenant_stock_receipts_all" ON stock_receipts FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "hq_all_stock_receipts" ON stock_receipts FOR ALL
  USING (is_hq_user());
