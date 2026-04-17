-- Tier 2 Workstream B.1 — NOT NULL constraint on tenant_id
-- Applies NOT NULL to 25 tables confirmed to have zero NULL rows.
-- Census: S307.5 Supabase MCP query, 18 April 2026.
-- Re-verified: S308 pre-apply census, all 25 tables n=0.
-- LL-285 defence-in-depth: catches missing tenant_id at DB layer
-- even if a future INSERT site omits it in code.

BEGIN;

ALTER TABLE public.batches              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.document_log         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.email_logs           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.expenses             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.food_ingredients     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.inventory            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.local_inputs         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.loyalty_config       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.orders               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.price_history        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.product_cogs         ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.product_format_bom   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.product_pricing      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.purchase_orders      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.qr_codes             ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.qr_security_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.shipments            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.stock_receipts       ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.stock_transfers      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.supplier_products    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.tenant_usage_log     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.user_profiles        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.wholesale_messages   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.wholesale_orders     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.wholesale_partners   ALTER COLUMN tenant_id SET NOT NULL;

COMMIT;
