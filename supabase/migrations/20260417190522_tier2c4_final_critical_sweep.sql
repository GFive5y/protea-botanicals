-- Tier 2C.4 — Final critical sweep (S314.4)
-- Fixes 8 remaining using='true' policy escapes across 7 tables.
-- None have tenant_id — all use HQ-only, user-scoped, or FK patterns.
-- Also tightens tenants.tenants_read_authenticated from true to (is_active OR HQ).
-- Applied via Supabase MCP apply_migration.
--
-- Post-fix: only LL-293 (public_holidays) and LL-295 (qr_codes) remain
-- as documented design patterns with using='true'.

-- brand_image_library: 2 duplicates → HQ-only (empty table)
DROP POLICY IF EXISTS "app_access" ON brand_image_library;
DROP POLICY IF EXISTS "app_access_brand_image_library" ON brand_image_library;
CREATE POLICY "hq_all_brand_image_library" ON brand_image_library FOR ALL
  USING (is_hq_user()) WITH CHECK (is_hq_user());

-- double_points_campaigns: public SELECT true → dropped (hq_all from S314.2b covers)
DROP POLICY IF EXISTS "Public read active campaigns" ON double_points_campaigns;

-- fx_rates: hq_admin_all true → HQ write + authenticated read (reference data)
DROP POLICY IF EXISTS "hq_admin_all" ON fx_rates;
CREATE POLICY "hq_all_fx_rates" ON fx_rates FOR ALL USING (is_hq_user()) WITH CHECK (is_hq_user());
CREATE POLICY "authenticated_read_fx_rates" ON fx_rates FOR SELECT USING (auth.uid() IS NOT NULL);

-- qr_banners: admin_all_banners true → HQ-only
DROP POLICY IF EXISTS "admin_all_banners" ON qr_banners;
CREATE POLICY "hq_all_qr_banners" ON qr_banners FOR ALL USING (is_hq_user()) WITH CHECK (is_hq_user());

-- redemptions: 2 admin true policies → user-scoped + HQ bypass
DROP POLICY IF EXISTS "Admin can view all redemptions" ON redemptions;
DROP POLICY IF EXISTS "Admin can update redemptions" ON redemptions;
CREATE POLICY "user_own_redemptions" ON redemptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "hq_all_redemptions" ON redemptions FOR ALL USING (is_hq_user()) WITH CHECK (is_hq_user());

-- stock_receipt_lines: app_access true → FK to stock_receipts (tenant-scoped)
DROP POLICY IF EXISTS "app_access_stock_receipt_lines" ON stock_receipt_lines;
CREATE POLICY "tenant_stock_receipt_lines" ON stock_receipt_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM stock_receipts sr WHERE sr.id = stock_receipt_lines.receipt_id
    AND (sr.tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()) OR is_hq_user())))
  WITH CHECK (EXISTS (SELECT 1 FROM stock_receipts sr WHERE sr.id = stock_receipt_lines.receipt_id
    AND (sr.tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()) OR is_hq_user())));

-- tenants: true → (is_active OR HQ). Design: authenticated users need tenant directory.
DROP POLICY IF EXISTS "tenants_read_authenticated" ON tenants;
CREATE POLICY "tenants_read_authenticated" ON tenants FOR SELECT
  USING ((is_active = true) OR is_hq_user());
