-- Tier 2C Stage 2 — MEDIUM RLS fixes (S314.2b)
-- Fixes 11 policies using is_admin()/auth_is_admin() without tenant scoping.
-- Applied via Supabase MCP in 2 groups (tenant_id vs non-tenant_id tables).
--
-- Group 1: Tables WITH tenant_id → tenant-scoped + HQ bypass
-- Group 2: Tables WITHOUT tenant_id → HQ-only or FK-based scoping
-- RLS-031 (message_templates) parked for S314.2c (needs schema change).

-- ═══ GROUP A: Platform tables (HQ-only) ═══

-- RLS-020: audit_log
DROP POLICY IF EXISTS "Admin read audit" ON audit_log;
CREATE POLICY "hq_read_audit_log" ON audit_log FOR SELECT USING (is_hq_user());

-- RLS-021: deletion_requests
DROP POLICY IF EXISTS "Admin manage requests" ON deletion_requests;
CREATE POLICY "hq_all_deletion_requests" ON deletion_requests FOR ALL USING (is_hq_user());

-- ═══ GROUP B: Tenant tables WITH tenant_id ═══

-- RLS-022: user_profiles
DROP POLICY IF EXISTS "admins_all_profiles" ON user_profiles;
CREATE POLICY "tenant_admins_own_users" ON user_profiles FOR ALL
  USING ((tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid())) AND auth_is_admin())
  WITH CHECK ((tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid())) AND auth_is_admin());
CREATE POLICY "hq_all_user_profiles" ON user_profiles FOR ALL USING (is_hq_user());

-- RLS-023: inventory_items
DROP POLICY IF EXISTS "Admin full access to inventory" ON inventory_items;
CREATE POLICY "tenant_admins_inventory_items" ON inventory_items FOR ALL
  USING (tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()));
CREATE POLICY "hq_all_inventory_items" ON inventory_items FOR ALL USING (is_hq_user());

-- RLS-024: purchase_orders
DROP POLICY IF EXISTS "Admin full access to POs" ON purchase_orders;
CREATE POLICY "tenant_admins_purchase_orders" ON purchase_orders FOR ALL
  USING (tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()));
CREATE POLICY "hq_all_purchase_orders" ON purchase_orders FOR ALL USING (is_hq_user());

-- RLS-026: stock_movements
DROP POLICY IF EXISTS "Admin full access to movements" ON stock_movements;
CREATE POLICY "tenant_admins_stock_movements" ON stock_movements FOR ALL
  USING (tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()));
CREATE POLICY "hq_all_stock_movements" ON stock_movements FOR ALL USING (is_hq_user());

-- RLS-027: suppliers
DROP POLICY IF EXISTS "Admin full access to suppliers" ON suppliers;
CREATE POLICY "tenant_admins_suppliers" ON suppliers FOR ALL
  USING (tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()));
CREATE POLICY "hq_all_suppliers" ON suppliers FOR ALL USING (is_hq_user());

-- ═══ GROUP C: Tables WITHOUT tenant_id (FK-based or HQ-only) ═══

-- RLS-025: purchase_order_items (FK to purchase_orders)
DROP POLICY IF EXISTS "Admin full access to PO items" ON purchase_order_items;
CREATE POLICY "tenant_po_items_via_po" ON purchase_order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.po_id
    AND (po.tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()) OR is_hq_user())))
  WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.po_id
    AND (po.tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()) OR is_hq_user())));

-- RLS-028: double_points_campaigns (no tenant_id — HQ-only until schema added)
DROP POLICY IF EXISTS "Admin manage campaigns" ON double_points_campaigns;
CREATE POLICY "hq_all_campaigns" ON double_points_campaigns FOR ALL USING (is_hq_user());

-- RLS-029: survey_responses (no tenant_id — HQ-only read)
DROP POLICY IF EXISTS "Admin read all surveys" ON survey_responses;
CREATE POLICY "hq_read_survey_responses" ON survey_responses FOR SELECT USING (is_hq_user());

-- RLS-030: ticket_messages (FK to support_tickets)
DROP POLICY IF EXISTS "ticket_messages_access" ON ticket_messages;
CREATE POLICY "ticket_messages_tenant_access" ON ticket_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = ticket_messages.ticket_id
    AND (st.tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()) OR is_hq_user())))
  WITH CHECK (EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = ticket_messages.ticket_id
    AND (st.tenant_id = (SELECT up.tenant_id FROM user_profiles up WHERE up.id = auth.uid()) OR is_hq_user())));
