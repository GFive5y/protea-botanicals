-- Tier 2C.2c — message_templates schema + LL-293 RLS (S314.2c)
-- Adds tenant_id column. Migrates 9 existing rows to Pure Premium.
-- Seeds 9 placeholder generic defaults (NULL tenant_id = shared).
-- Drops 2 broken policies (templates_public_read CRITICAL escape,
-- templates_admin_write cross-tenant). Creates LL-293 pattern RLS.
-- Applied via Supabase MCP apply_migration.

-- Schema
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

-- Migrate existing 9 rows to Pure Premium
UPDATE message_templates SET tenant_id = 'f8ff8d07-7688-44a7-8714-5941ab4ceaa5' WHERE tenant_id IS NULL;

-- Seed 9 placeholder generic defaults (is_active=false, content=[PLACEHOLDER])
INSERT INTO message_templates (id, name, trigger_type, subject, content, send_whatsapp, send_inbox, delay_minutes, is_active, tenant_id) VALUES
(gen_random_uuid(), 'Birthday Bonus (Default)', 'birthday_bonus', '[PLACEHOLDER] Birthday subject', '[PLACEHOLDER] Birthday content', true, true, 0, false, NULL),
(gen_random_uuid(), 'First Purchase Welcome (Default)', 'first_purchase', '[PLACEHOLDER] First purchase subject', '[PLACEHOLDER] First purchase content', false, true, 0, false, NULL),
(gen_random_uuid(), 'Referral Redeemed (Default)', 'referral_redeemed', '[PLACEHOLDER] Referral redeemed subject', '[PLACEHOLDER] Referral redeemed content', true, true, 0, false, NULL),
(gen_random_uuid(), 'Referral Welcome (Default)', 'referral_welcome', '[PLACEHOLDER] Referral welcome subject', '[PLACEHOLDER] Referral welcome content', true, true, 0, false, NULL),
(gen_random_uuid(), 'Ticket Opened (Default)', 'ticket_opened', '[PLACEHOLDER] Ticket opened subject', '[PLACEHOLDER] Ticket opened content', false, true, 0, false, NULL),
(gen_random_uuid(), 'Ticket Resolved (Default)', 'ticket_resolved', '[PLACEHOLDER] Ticket resolved subject', '[PLACEHOLDER] Ticket resolved content', false, true, 0, false, NULL),
(gen_random_uuid(), 'Tier Upgrade Silver (Default)', 'tier_upgrade_silver', '[PLACEHOLDER] Tier upgrade silver subject', '[PLACEHOLDER] Tier upgrade silver content', true, true, 0, false, NULL),
(gen_random_uuid(), 'Tier Upgrade Gold (Default)', 'tier_upgrade_gold', '[PLACEHOLDER] Tier upgrade gold subject', '[PLACEHOLDER] Tier upgrade gold content', true, true, 0, false, NULL),
(gen_random_uuid(), 'Tier Upgrade Platinum (Default)', 'tier_upgrade_platinum', '[PLACEHOLDER] Tier upgrade platinum subject', '[PLACEHOLDER] Tier upgrade platinum content', true, true, 0, false, NULL);

-- Drop broken policies
DROP POLICY IF EXISTS "templates_public_read" ON message_templates;
DROP POLICY IF EXISTS "templates_admin_write" ON message_templates;

-- LL-293 pattern: tenants read shared defaults + own; only HQ writes shared defaults
CREATE POLICY "tenant_message_templates_all" ON message_templates FOR ALL
  USING ((tenant_id IS NULL) OR (tenant_id = user_tenant_id()))
  WITH CHECK ((tenant_id IS NULL AND is_hq_user()) OR (tenant_id = user_tenant_id()));

CREATE POLICY "hq_all_message_templates" ON message_templates FOR ALL
  USING (is_hq_user()) WITH CHECK (is_hq_user());
