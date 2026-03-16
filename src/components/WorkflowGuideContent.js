// WorkflowGuideContent.js v1.0
// WP-X Phase C: All 26 tab guide content objects
// Each guide reflects actual live data flows — confirmed from DB audit v58.
// Import the guide you need and spread it into <WorkflowGuide {...GUIDE_XXX} />

// ─── HQ GUIDES ──────────────────────────────────────────────────────────────

export const GUIDE_OVERVIEW = {
  tabId: "hq-overview",
  title: "HQ Overview",
  description:
    "Your command centre. Every tile reads live data — scans today from scan_logs, open tickets from support_tickets, unread messages from customer_messages, revenue MTD from orders, and stock alerts from inventory_items where quantity_on_hand < reorder_level.",
  steps: [
    "Check the top row first — QR scans today, active users, and open tickets give you the pulse of the business in one glance.",
    "The Import ERP tile shows open purchase orders and stock below reorder level. If either is non-zero, go to Procurement or Reorder tabs.",
    "The P&L tile shows month-to-date revenue from live orders. If it shows R0, check HQ → P&L tab.",
    "Birthday tile shows customers with birthdays today — send them a message from Admin → Comms.",
    "The Fraud tile pulls from get_scan_velocity_flags() — any customer scanning 3+ times in 60 seconds appears here automatically.",
  ],
  warnings: [
    "Stock alerts fire when quantity_on_hand < reorder_level on inventory_items. Make sure reorder_level is set per item.",
    "Birthday automation requires pg_cron (Supabase Pro) — until then, check this tile daily and send manual messages.",
    "The P&L tile may show placeholder data until HQProfitLoss is fully wired to live orders.",
  ],
  dataFlow: [
    "scan_logs → scans today (WHERE scanned_at::date = today)",
    "support_tickets → open count (WHERE status = 'open')",
    "customer_messages → unread count (WHERE read_at IS NULL AND direction = 'inbound')",
    "orders → revenue MTD (WHERE status = 'paid' AND created_at >= start of month)",
    "inventory_items → low stock (WHERE quantity_on_hand < reorder_level AND is_active = true)",
    "user_profiles → birthdays today (EXTRACT DAY/MONTH from date_of_birth)",
    "get_scan_velocity_flags() RPC → fraud alerts",
  ],
  tips: [
    "This should be the first screen you open every morning.",
    "High open ticket count? Go to Admin → Comms → Customers and work through the queue.",
    "Geo heatmap in HQ Analytics shows WHERE customers scan — use it to identify new stockist opportunities.",
  ],
};

export const GUIDE_SUPPLY_CHAIN = {
  tabId: "supply-chain",
  title: "Supply Chain",
  description:
    "Tracks the full import pipeline from overseas supplier to warehouse receipt. Shows purchase orders, shipments, and landed cost calculations using live USD/ZAR from fx_rates. The FX rate is locked at PO creation.",
  steps: [
    "Check open purchase orders — any PO with status not 'complete' needs supplier follow-up.",
    "Landed cost = (unit_price_usd × usd_zar_rate) + shipping_cost_usd + clearance_fee_usd. Rate is locked at creation.",
    "When stock arrives, mark the PO as received — this updates inventory_items.quantity_on_hand and creates a stock_movements record (purchase_in).",
    "Use the shipments section to track outbound distribution to retail locations.",
  ],
  warnings: [
    "PO FX rate is locked at creation (fx_rate_locked column). The live rate does NOT change existing PO costs.",
    "purchase_orders has both 'status' AND 'po_status' columns — both identical. Use 'status' (has the index).",
    "Receiving a PO updates inventory_items quantity — confirm you're receiving against the correct inventory item.",
  ],
  dataFlow: [
    "purchase_orders → PO list (status, total_usd, fx_rate_locked, landed_cost_zar)",
    "purchase_order_items → line items (supplier_product_id, quantity, unit_price_usd)",
    "fx_rates → live USD/ZAR for new PO cost estimates",
    "inventory_items → quantity_on_hand increases on receive",
    "stock_movements → 'purchase_in' record on receive",
  ],
  tips: [
    "A 10% ZAR depreciation adds ~R10-15/unit to landed hardware cost. Watch the LiveFXBar before creating POs.",
    "Upload supplier invoices to HQ → Documents — AI extracts line items and proposes updates automatically.",
  ],
};

export const GUIDE_DISTRIBUTION = {
  tabId: "distribution",
  title: "Distribution",
  description:
    "Manages outbound shipments from warehouse to retail stockists. Each shipment links finished goods (inventory_items) to a destination tenant (retailer). RLS ensures retailers only see their own shipments.",
  steps: [
    "Create a shipment by selecting the destination tenant and adding inventory items.",
    "Confirm the item has sufficient quantity_on_hand before dispatching.",
    "When the retailer confirms receipt, update the shipment status.",
    "Use shipment history to track what each retailer has received.",
  ],
  warnings: [
    "Shipment creation does NOT automatically deduct from inventory_items.",
    "destination_tenant_id must match a valid tenant — retailers must be onboarded in HQ → Shops first.",
    "Retailers can only see shipments WHERE destination_tenant_id = their tenant_id (RLS enforced).",
  ],
  dataFlow: [
    "shipments → shipment records (destination_tenant_id, status)",
    "shipment_items → items per shipment (inventory_item_id → inventory_items)",
    "tenants → retailer list for destination selector",
  ],
  tips: [
    "Check HQ → Retailer Health before allocating stock — prioritise high-performing retailers.",
  ],
};

export const GUIDE_SHOPS = {
  tabId: "shops",
  title: "Shop Manager",
  description:
    "Creates and manages retail tenant accounts. Each tenant gets isolated data via RLS (tenant_id). The HQ tenant ID is hardcoded: 43b34c33-6864-4f02-98dd-df1d340475c3.",
  steps: [
    "Create a new tenant to onboard a retailer — generates the tenant_id used to scope all their data.",
    "After creating the tenant, create an admin user and set their tenant_id and role = 'admin'.",
    "The retailer's /admin dashboard automatically shows only their own data.",
    "The tenant slug is used for future subdomain routing (e.g. greenleaf.proteabotanicals.co.za).",
  ],
  warnings: [
    "Never delete the HQ tenant (ID: 43b34c33-6864-4f02-98dd-df1d340475c3).",
    "Archive rather than delete tenants — deleting does not cascade delete their data.",
    "Always confirm tenant_id is set correctly when creating users.",
  ],
  dataFlow: [
    "tenants → tenant registry (id, name, slug)",
    "user_profiles → users scoped to tenant (tenant_id FK → tenants)",
  ],
  tips: [
    "One deployment supports unlimited retailers — each new stockist is just a new row in tenants.",
  ],
};

export const GUIDE_ANALYTICS = {
  tabId: "analytics",
  title: "HQ Analytics",
  description:
    "Platform-wide scan and engagement analytics. ALL charts read from scan_logs — NEVER from the legacy scans table. Geo heatmap uses ip_lat/ip_lng from scan_logs.",
  steps: [
    "Scan volume chart: daily/weekly/monthly counts from scan_logs.scanned_at.",
    "Geo heatmap: ip_lat, ip_lng, ip_city, ip_province — populated on every scan.",
    "Device breakdown: scan_logs.device_type and scan_logs.browser columns.",
    "Filter by date range, batch_id (product), or ip_province (region).",
  ],
  warnings: [
    "CRITICAL: always query scan_logs for analytics — NOT the legacy scans table.",
    "scanService.getScanGeoAnalytics() queries scan_logs correctly — do not change it.",
    "These are platform-wide figures across all tenants. Use tenant_id filter for per-retailer views.",
  ],
  dataFlow: [
    "scan_logs → all analytics (scanned_at, ip_lat, ip_lng, ip_province, device_type, browser, scan_outcome)",
    "qr_codes → QR performance (scan_count, claimed, batch_id)",
    "batches → product name (via batch_id)",
    "scanService.getScanGeoAnalytics() → the RPC for geo charts",
  ],
  tips: [
    "High scan density in an area with no stockist = new retailer opportunity.",
    "If >80% mobile users, WP-J mobile responsiveness is your top pre-launch priority.",
  ],
};

export const GUIDE_RETAILER_HEALTH = {
  tabId: "retailer-health",
  title: "Retailer Health",
  description:
    "Scores each retail tenant using the retailer_performance VIEW. Aggregates scan counts, order volumes, and customer engagement per tenant. Flags declining performers for account management.",
  steps: [
    "Health score is from the retailer_performance VIEW — aggregates scan + order + loyalty data per tenant.",
    "League table ranks all retailers — identify top performers and underperformers.",
    "Click any retailer for detailed metrics: scan velocity, customer count, average order value.",
  ],
  warnings: [
    "retailer_performance VIEW returns 0 rows if no retailers are onboarded yet — expected at launch.",
    "Scores need real data to be meaningful — first month will show low scores across the board.",
  ],
  dataFlow: [
    "retailer_performance VIEW → aggregated per-tenant metrics",
    "scan_logs → scan velocity per tenant",
    "orders → revenue per tenant",
    "user_profiles → customer count per tenant",
  ],
  tips: [
    "High scans + low orders = customers verify but don't buy online. Target them with a direct purchase incentive.",
  ],
};

export const GUIDE_SUPPLIERS = {
  tabId: "suppliers",
  title: "Suppliers",
  description:
    "Overseas supplier catalogue with USD pricing. Prices feed directly into the COGS engine and landed cost calculations. Reliability scores track historical on-time delivery.",
  steps: [
    "Add supplier products with USD unit price, weight per unit (for shipping), and MOQ.",
    "Keep prices current — changes here immediately affect all COGS calculations referencing these items.",
    "Upload supplier invoices to HQ → Documents for AI-powered bulk price updates.",
  ],
  warnings: [
    "CRITICAL: supplier_products has NO updated_at column — never include it in UPDATE calls.",
    "Changing a USD price here affects ALL product_cogs recipes that use this item via hardware_item_id or terpene_item_id.",
    "Do not delete supplier products referenced in product_cogs — this breaks COGS calculations.",
  ],
  dataFlow: [
    "suppliers → supplier registry (name, country, reliability_score)",
    "supplier_products → catalogue (name, unit_price_usd, weight_kg_per_unit — NO updated_at)",
    "product_cogs → references via hardware_item_id + terpene_item_id",
  ],
  tips: [
    "Upload Eybna price lists to Documents — AI maps line items to existing supplier_products automatically.",
    "Weight per unit feeds the DDP Air shipping calculation — keep it accurate.",
  ],
};

export const GUIDE_PROCUREMENT = {
  tabId: "procurement",
  title: "Procurement",
  description:
    "Full PO lifecycle: draft → ordered → in_transit → received → complete. FX rate locked at creation. Receiving a PO increases inventory_items stock and creates stock_movements (purchase_in).",
  steps: [
    "Create PO: select supplier, add line items from their catalogue, choose shipping mode.",
    "USD/ZAR rate locks at creation (fx_rate_locked column) — doesn't change for existing POs.",
    "DDP Air rates: ≤21kg = $15.80/kg, 21-50kg = $15.50/kg, 50-100kg = $15.20/kg, 100kg+ = $14.90/kg + $25 clearance.",
    "On receive: confirm quantities match the delivery. This writes to inventory_items and stock_movements.",
  ],
  warnings: [
    "purchase_orders has both 'status' AND 'po_status' — both identical. Use 'status' (has index idx_po_status).",
    "Never delete a received PO — it's part of the stock movement audit trail.",
    "purchase_order_items (normalised table) is the source of truth — not the legacy items JSONB field.",
  ],
  dataFlow: [
    "purchase_orders → header (supplier_id, status, fx_rate_locked, landed_cost_zar)",
    "purchase_order_items → lines (po_id, supplier_product_id, item_id → inventory_items, quantity)",
    "inventory_items → quantity_on_hand increases on receive",
    "stock_movements → 'purchase_in' record on receive",
  ],
  tips: [
    "Lock in POs when ZAR is strong — watch the LiveFXBar for the best timing.",
    "Use supplier_invoice_ref to cross-reference against the supplier's invoice for accounting.",
  ],
};

export const GUIDE_COSTING = {
  tabId: "costing",
  title: "COGS Costing Engine",
  description:
    "Recipe-based per-unit cost calculation. Each product_cogs row is one SKU formula. COGS recalculates live as FX rates change via the LiveFXBar. Transport and misc costs are TOTAL BATCH costs — always divide by batch_size.",
  steps: [
    "Formula: Hardware(USD×FX) + Terpene(ul÷1000÷50×USD×FX) + Distillate(ml×ZAR/ml) + Packaging + Labour + Transport÷batch + Misc÷batch + Lab÷batch.",
    "Multi-chamber SKUs (Triple/Dual Chamber): terpene + distillate come from chambers[] JSONB array, NOT top-level fields.",
    "Use Local Inputs sub-tab to set ZAR costs for distillate, packaging, and labour.",
    "Batch scaler (1/50/100/500/1k) shows total batch cost at scale.",
  ],
  warnings: [
    "product_cogs column names: product_name (NOT name), sku (NOT sku_name).",
    "transport_cost_zar is TOTAL batch cost — divide by batch_size for per-unit. Do not treat as per-unit already.",
    "Multi-chamber: chambers is JSONB array — never write terpene/distillate to top-level fields for these SKUs.",
    "D9 Distillate cost_price = R0.00 in local_inputs — D9 product COGS is WRONG. Fix this in Local Inputs tab NOW.",
  ],
  dataFlow: [
    "product_cogs → recipes (product_name, sku, hardware_item_id, chambers JSONB, batch_size, transport_cost_zar)",
    "supplier_products → USD prices (via hardware_item_id, terpene_item_id)",
    "local_inputs → ZAR costs (via distillate_input_id, packaging_input_id, labour_input_id)",
    "fx_rates → live USD/ZAR for all conversions",
    "loyalty_config → loyalty cost line in COGS",
  ],
  tips: [
    "Fix D9 Distillate cost in Local Inputs FIRST — it's showing R0 which makes D9 COGS meaningless.",
    "Use landed cost calculator when placing a new hardware order — it updates shipping_alloc_zar per unit.",
  ],
};

export const GUIDE_PRICING = {
  tabId: "pricing",
  title: "Pricing & Margins",
  description:
    "Sets wholesale and retail prices per SKU. Shows margin waterfall: Sell Price → minus COGS → minus Loyalty Cost → Net Margin. All figures update live as FX rates change.",
  steps: [
    "Set wholesale price (to retailers) and retail price (direct online) per SKU.",
    "Margin waterfall: Sell Price - COGS - Loyalty Cost = Net Margin.",
    "FX sensitivity column shows margin change per R1 USD/ZAR movement.",
    "Colour: green >40%, amber 20-40%, red <20%.",
  ],
  warnings: [
    "Prices here feed into inventory_items.sell_price. Without sell_price > 0, products are INVISIBLE in Shop.js.",
    "If COGS is wrong (D9 distillate = R0), margins here are also wrong. Fix COGS inputs first.",
    "Wholesale price should always be below retail price.",
  ],
  dataFlow: [
    "product_cogs → COGS per unit",
    "product_pricing → sell prices (product_cogs_id FK, wholesale_price, retail_price)",
    "fx_rates → FX sensitivity calculation",
    "loyalty_config → loyalty cost per unit",
    "inventory_items → sell_price gates Shop.js visibility",
  ],
  tips: [
    "Online margin minus wholesale margin = extra earned per unit by selling direct. This is the loyalty programme's ROI.",
    "63% gross margin online at R400 sell price. Aggressive loyalty at R0.16/pt for 100 pts = R16 cost → R220+ net per unit.",
  ],
};

export const GUIDE_PL = {
  tabId: "pl",
  title: "Profit & Loss",
  description:
    "Revenue waterfall from live orders. Realtime subscription via hq-pl-orders JS channel on the orders table. Orders column is 'total' — NOT 'total_amount'.",
  steps: [
    "Revenue: orders WHERE status = 'paid' for selected period.",
    "COGS line: units sold × product_cogs formula per SKU.",
    "Loyalty cost: points issued × redemption_value_zar × (1 - breakage_rate).",
    "Use period selector for daily/weekly/monthly views.",
  ],
  warnings: [
    "orders uses column 'total' — NOT 'total_amount'. Any query using total_amount returns NULL.",
    "Only status = 'paid' orders count as revenue. Pending/confirmed are not yet revenue.",
    "P&L may not be fully wired to live orders yet — some figures may be placeholder.",
  ],
  dataFlow: [
    "orders → revenue (status='paid', total column)",
    "order_items → line items per order",
    "loyalty_transactions → points issued for loyalty cost",
    "hq-pl-orders → realtime JS channel (orders table)",
  ],
  tips: [
    "Run a campaign and check this page afterward to see the real loyalty cost impact in ZAR.",
  ],
};

export const GUIDE_REORDER = {
  tabId: "reorder",
  title: "Reorder Scoring",
  description:
    "Ranks inventory items by reorder urgency. Reads inventory_items where quantity_on_hand approaches reorder_level. Supplier reliability scores from purchase_orders history feed the scoring.",
  steps: [
    "Red items: quantity_on_hand ≤ reorder_level — immediate action required.",
    "Score factors: days of stock remaining (from sales velocity), supplier lead time, reliability score.",
    "Click any item for full stock movement history from stock_movements.",
    "One-click Create PO opens a pre-filled draft purchase order.",
  ],
  warnings: [
    "If reorder_level = 0 on all items, no alerts fire. Set reorder levels manually.",
    "Sales velocity is based on order history — low in launch phase. Set reorder_level manually based on expected order frequency.",
    "Use inventory_items (37 rows, active) — not the legacy inventory table (3 rows).",
  ],
  dataFlow: [
    "inventory_items → stock levels (quantity_on_hand, reorder_level, is_active)",
    "stock_movements → consumption history (sale_out, production_use)",
    "purchase_orders → supplier lead time and reliability",
  ],
  tips: [
    "Set reorder_level to 3-4 weeks of expected stock — gives buffer for 2-3 week overseas shipment lead time.",
  ],
};

export const GUIDE_DOCUMENTS = {
  tabId: "documents",
  title: "Document Vault",
  description:
    "AI-powered document ingestion via the process-document Edge Function (Claude Vision). Upload any supplier invoice, COA, price list, or delivery note — AI extracts structured data and proposes live updates for human confirmation. Nothing writes automatically.",
  steps: [
    "Upload PDF or image — document type is auto-detected by AI (can be overridden).",
    "AI extraction runs via process-document Edge Function using Claude claude-sonnet-4-20250514.",
    "Review the three-panel screen: original document, extracted fields, proposed DB updates.",
    "Confirm, edit, or reject each proposed update before anything writes to the database.",
    "Confirmed documents stored in document_log with confidence_score and applied_updates JSONB.",
  ],
  warnings: [
    "Nothing is written automatically — every extraction requires human confirmation by design.",
    "COA PDFs link to batches via batches.coa_document_id → document_log.id. Verify batch number matches.",
    "process-document requires the Anthropic API key set in Supabase secrets.",
  ],
  dataFlow: [
    "document_log → registry (document_type, file_url, extracted_data JSONB, confidence_score, status)",
    "batches → coa_document_id updated after COA confirmation",
    "supplier_products → price updates proposed after invoice extraction",
    "purchase_orders → source_document_id links PO to invoice",
    "process-document Edge Function → Claude Vision AI extraction",
  ],
  tips: [
    "Upload Eybna price lists here — AI maps all line items to existing supplier_products in one go.",
    "COAs must be uploaded and linked before QR code product verification works correctly.",
  ],
};

export const GUIDE_HQ_PRODUCTION = {
  tabId: "hq-production",
  title: "HQ Production",
  description:
    "Assembly runs converting raw materials into finished products. Writes to batches, inventory_items (deduct materials + add finished goods), stock_movements, and production_runs. Setting sell_price here makes the product visible in the customer shop.",
  steps: [
    "Create a batch (batch_number must be unique — format PB-XXX-YYYY-NNNN).",
    "Run assembly: select input materials from inventory_items, set units produced, confirm.",
    "On confirm: materials decrease (production_use movement), finished goods increase (production_output movement).",
    "Set sell_price via SetPricePanel — required for product to appear in Shop.js.",
    "Attach COA via Documents tab — enables /verify/:batchId product verification.",
  ],
  warnings: [
    "CRITICAL: batches has NO created_at AND NO updated_at — always ORDER BY production_date.",
    "hq-production is the ONLY production tab. Do not confuse batches (5 rows, ACTIVE) with production_batches (0 rows, UNUSED LEGACY).",
    "Shop.js visibility requires ALL THREE: is_active=true AND sell_price>0 AND quantity_on_hand>0.",
    "production_run_inputs links runs to items: run_id → production_runs, item_id → inventory_items.",
  ],
  dataFlow: [
    "batches → batch registry (batch_number, product_name, production_date, inventory_item_id — NO created_at)",
    "production_runs → assembly records (batch_id → batches)",
    "production_run_inputs → materials consumed (run_id, item_id → inventory_items)",
    "inventory_items → quantity_on_hand ± on production",
    "stock_movements → audit trail (production_output + production_use)",
    "inventory_items.sell_price → gates Shop.js visibility",
  ],
  tips: [
    "After a production run, immediately set sell_price — otherwise stock sits invisible to customers.",
    "batch_number in the QR code must match the DB batch for product verification to work.",
  ],
};

export const GUIDE_HQ_LOYALTY = {
  tabId: "loyalty",
  title: "Loyalty Economics Engine",
  description:
    "Single control panel for the entire loyalty programme. All values in loyalty_config (ONE ROW) propagate live to ScanResult, CheckoutPage, Loyalty page, and Redeem. Schema presets change everything in one click and immediately recalculate all customer tiers (WP-Z).",
  steps: [
    "Schema tab (🎛️): pick Conservative, Standard, or Aggressive. Writes all values + recalculates all tiers instantly.",
    "Fine-tune individual values in Earning Rules, Tiers, Economics, Referrals, QR Security after applying a schema.",
    "Simulator (📈): drag online % slider to model channel mix impact on net margin.",
    "Campaigns (📅): create time-limited double-points promotions.",
    "Economics tab: shows live programme cost as % of revenue from real loyalty_transactions data.",
  ],
  warnings: [
    "loyalty_config has exactly ONE ROW — every UPDATE must use .eq('id', config.id). Never insert a second row.",
    "loyalty_config HAS updated_at — safe to include in UPDATE calls (confirmed v58 audit).",
    "Tier thresholds now drive the DB trigger via recalculate_all_tiers() RPC (WP-Z). Changing thresholds here recalculates all stored tiers immediately.",
    "loyalty_transactions uses transaction_date (NOT created_at) — leaderboard RPCs query this column.",
  ],
  dataFlow: [
    "loyalty_config → all programme parameters (ONE ROW ONLY)",
    "loyalty_transactions → programme cost stats (transaction_date column)",
    "double_points_campaigns → time-limited multiplier events",
    "recalculate_all_tiers() RPC → bulk tier update after any threshold change",
    "ScanResult.js + CheckoutPage.js + Loyalty.js → all read loyalty_config on load",
  ],
  tips: [
    "Start with Standard schema, run 30 days, then check Economics tab. If actual redemption rate < assumed breakage, move to Aggressive.",
    "The Simulator uses real numbers: COGS R103/unit, wholesale R280. The margin figures are accurate.",
  ],
};

export const GUIDE_FRAUD = {
  tabId: "fraud",
  title: "Fraud Detection",
  description:
    "Surfaces suspicious scan behaviour using get_scan_velocity_flags() SECURITY DEFINER RPC. Detects 3+ scans in 60 seconds. Shows anomaly_score from user_profiles. Enables account suspension.",
  steps: [
    "Velocity flags list: users who scanned 3+ times in 60s within last 7 days.",
    "Review each flagged user — check scan history in Admin → Customers → Customer 360 → Scans.",
    "Confirmed fraud: set user_profiles.is_suspended = true. Prevents point earning.",
    "anomaly_score on user_profiles accumulates automatically as patterns are detected.",
    "All admin actions should be logged in audit_log (admin_id, action, target_id).",
  ],
  warnings: [
    "get_scan_velocity_flags() is SECURITY DEFINER — reads scan_logs across all users regardless of RLS.",
    "is_suspended = true prevents earning but does NOT block login.",
    "POPIA deletion requests (deletion_requests table) must be processed — legal obligation.",
  ],
  dataFlow: [
    "get_scan_velocity_flags() SECURITY DEFINER RPC → velocity flags",
    "scan_logs → detailed scan history per user",
    "user_profiles → anomaly_score, is_suspended",
    "audit_log → admin action trail (admin_id, action, target_type, target_id, details JSONB)",
  ],
  tips: [
    "A high anomaly_score is more reliable than a single velocity flag — look for patterns, not single events.",
    "max_scans_per_qr in loyalty_config already prevents earning from the same QR twice. Fraud here = rapid scanning of many different QRs.",
  ],
};

// ─── ADMIN GUIDES ─────────────────────────────────────────────────────────────

export const GUIDE_ADMIN_BATCHES = {
  tabId: "admin-batches",
  title: "Batch Manager",
  description:
    "Operational view of production batches. Batches are created in HQ → Production. Admin can view details, update lifecycle_status, and manage COA linkage. The batches table has NO created_at or updated_at — always use production_date for ordering.",
  steps: [
    "View batches ordered by production_date (most recent first).",
    "Update lifecycle_status: active → lab_testing → certified → distributed → depleted.",
    "Batch should have lab_certified = true and coa_document_id set before QR codes are generated.",
    "Archive depleted batches with is_archived = true — keeps DB clean without deleting history.",
  ],
  warnings: [
    "CRITICAL: batches has NO created_at — ORDER BY production_date only.",
    "Do not confuse batches (ACTIVE, 5 rows) with production_batches (UNUSED, 0 rows).",
    "Batch creation is HQ only — admin can update status but not create.",
  ],
  dataFlow: [
    "batches → batch list (batch_number, product_name, production_date, lifecycle_status, lab_certified, coa_document_id)",
    "qr_codes → QR codes per batch (batch_id FK)",
    "scan_logs → scan analytics per batch",
    "inventory_items → stock linkage (inventory_item_id FK)",
  ],
  tips: [
    "Keep lifecycle_status accurate — supply chain uses it to know which batches are available for distribution.",
  ],
};

export const GUIDE_ADMIN_SHIPMENTS = {
  tabId: "admin-shipments",
  title: "Shipments",
  description:
    "Inbound stock from HQ and outbound B2B wholesale distribution. Admin confirms receipt of HQ shipments. RLS: only sees shipments where destination_tenant_id = own tenant_id.",
  steps: [
    "Inbound from HQ: status 'dispatched' — confirm receipt to update to 'delivered'.",
    "Record any quantity discrepancies in shipment notes before confirming.",
    "This tab is for B2B wholesale only — customer orders flow through the checkout/PayFast path.",
  ],
  warnings: [
    "Confirming a shipment does NOT automatically update stock levels.",
    "Only sees own tenant's shipments (RLS enforced on destination_tenant_id).",
  ],
  dataFlow: [
    "shipments → records (destination_tenant_id, status)",
    "shipment_items → items (shipment_id, inventory_item_id)",
  ],
  tips: [
    "Cross-reference against the HQ purchase order before confirming receipt.",
  ],
};

export const GUIDE_ADMIN_QR = {
  tabId: "admin-qr",
  title: "QR Code Engine",
  description:
    "Generates HMAC-signed QR codes via the sign-qr Edge Function. Six QR types. Each QR has a scan_actions JSONB stack defining what happens on scan. JWT verify on sign-qr RESETS on every deploy — always disable after redeploy.",
  steps: [
    "Select a certified batch (lab_certified = true) for QR generation.",
    "Choose QR type: product_insert, packaging, promotional, event, wearable, retail_display.",
    "Configure scan_actions: award_points, show_banner, show_product, redirect, event_checkin, loyalty_signup, custom_message.",
    "Generate 1/10/50/100 codes — each is a unique HMAC-signed string from sign-qr Edge Function.",
    "Download PNG for print. Test Scan button opens /scan/:qrCode to preview the customer experience.",
  ],
  warnings: [
    "CRITICAL: sign-qr JWT verify RESETS on every Supabase deploy. After any redeploy: Supabase Dashboard → Functions → sign-qr → Disable JWT verification.",
    "verify-qr Edge Function verifies HMAC on every scan — both must be deployed together.",
    "QR codes are permanent — archive rather than delete.",
    "scan_actions JSONB: first matching action type wins. Order matters.",
  ],
  dataFlow: [
    "qr_codes → registry (qr_code HMAC string, batch_id, scan_actions JSONB, scan_count, claimed, claimed_by)",
    "batches → batch selector",
    "sign-qr Edge Function → HMAC signing",
    "verify-qr Edge Function → HMAC verification on scan",
    "scan_logs → analytics per QR",
  ],
  tips: [
    "Always Test Scan before printing — confirms the customer will see what you expect.",
    "Set points_value on the QR itself to override global pts_qr_scan for specific promotions.",
  ],
};

export const GUIDE_ADMIN_USERS = {
  tabId: "admin-users",
  title: "Users",
  description:
    "Admin and retailer user account management. HQ access is controlled by user_profiles.hq_access boolean — NOT a role value. There is no 'hq' role. Always UPDATE user_profiles — never upsert.",
  steps: [
    "Grant admin access: set role = 'admin' on user_profiles.",
    "Grant HQ access: set hq_access = true (separate from role).",
    "Never delete accounts — set is_suspended = true to disable while preserving data.",
  ],
  warnings: [
    "CRITICAL: there is NO 'hq' role value. HQ access = hq_access = true boolean column.",
    "NEVER upsert user_profiles — UPDATE only. Upsert can reset loyalty_points, role, and other fields.",
    "user_profiles.full_name ONLY — NO first_name column.",
    "user_profiles.referred_by is a FK to user_profiles.id (self-referential) — not plain text.",
  ],
  dataFlow: [
    "user_profiles → user registry (id, role, hq_access, full_name, email, loyalty_points, loyalty_tier, is_suspended, tenant_id)",
    "audit_log → admin action records",
  ],
  tips: [
    "New retailer admin: create in Supabase Auth first, then UPDATE user_profiles to set role='admin' and correct tenant_id.",
  ],
};

export const GUIDE_ADMIN_CUSTOMERS = {
  tabId: "admin-customers",
  title: "Customers (CRM)",
  description:
    "Customer engagement and CRM. Lists all customers with loyalty tier and engagement data. Customer 360 drawer (click any row) shows full history: orders, scans from scan_logs, loyalty transactions, messages.",
  steps: [
    "Filter by tier, phone_verified, or email_marketing opt-in.",
    "Click customer → Customer 360 drawer → 5 tabs: Details, Orders, Loyalty, Scans, Messages.",
    "Messages tab: compose targeted messages, detect birthday/tier-up opportunities, broadcast to segments.",
    "Loyalty tab: view transaction history, make manual adjustments (creates loyalty_transactions record).",
    "Scans tab: reads from scan_logs (NOT legacy scans table) — full history with location + device data.",
  ],
  warnings: [
    "Customers tab = CRM only. Messaging is in the Comms tab — not here.",
    "Manual loyalty adjustments MUST create a loyalty_transactions record AND update user_profiles.loyalty_points — never update points without a transaction.",
    "Scans tab queries scan_logs (active analytics) — NOT the legacy scans table.",
  ],
  dataFlow: [
    "user_profiles → customer list (loyalty_points, loyalty_tier, phone_verified, email_marketing, date_of_birth)",
    "orders + order_items → purchase history",
    "loyalty_transactions → points history",
    "scan_logs → scan history (NOT legacy scans)",
    "customer_messages → message history",
    "getInboxUnreadCount(userId) → exported, used by ClientHeader badge",
  ],
  tips: [
    "Sort by loyalty_points DESC to find your highest-value customers for Platinum tier targeting.",
    "email_marketing = true filter = your opted-in broadcast audience for Comms → Broadcast.",
  ],
};

export const GUIDE_ADMIN_COMMS = {
  tabId: "admin-comms",
  title: "Communications Centre",
  description:
    "Unified inbox for THREE separate messaging systems. Each uses different column names. System 1: customer_messages (body column). System 2: support_tickets + ticket_messages (content column). System 3: wholesale_messages (admin/HQ only).",
  steps: [
    "Customers channel: customers sorted by last activity. Click to see unified message + ticket thread.",
    "Ticket cards in thread: click to open TicketThread for full reply, status changes, internal notes.",
    "On resolve: auto-reply fires from message_templates WHERE trigger = 'ticket_resolved'.",
    "Wholesale channel: wholesale_partners messages, completely isolated from customer data.",
    "Broadcast: send to all customers matching tier/email_marketing filter. Writes customer_messages for each recipient.",
  ],
  warnings: [
    "THREE SYSTEMS — never merge or confuse column names:",
    "customer_messages: .body (NOT .content), .read_at (NOT .read boolean), .message_type (NOT .type)",
    "ticket_messages: .content (NOT .body), sender_type: 'customer'|'admin'|'auto'",
    "wholesale_messages: admin/HQ only — customers cannot see this (RLS enforced)",
    "Realtime: admin-dashboard-msgs (customer_messages), admin-dashboard-tickets (support_tickets), ticket-thread-{id} (ticket_messages)",
  ],
  dataFlow: [
    "customer_messages → direct messages (body, message_type, direction, read_at, sent_by)",
    "support_tickets → ticket headers (status, ticket_number PB-SUP-XXXXX, assigned_to)",
    "ticket_messages → replies (content, sender_type, ticket_id)",
    "wholesale_messages → partner comms (partner_id → wholesale_partners)",
    "message_templates → auto-replies (trigger, body, {{variable}} interpolation)",
    "send-notification Edge Function → WhatsApp on every outbound message",
    "notification_log → delivery receipts",
  ],
  tips: [
    "commsBadge = unread customer_messages + open support_tickets. Both update in realtime.",
    "Twilio must be configured with SA WhatsApp number for notifications to reach SA customers.",
  ],
};

export const GUIDE_ADMIN_SECURITY = {
  tabId: "admin-security",
  title: "Security",
  description:
    "Fraud detection via get_scan_velocity_flags() RPC. Account suspension and POPIA deletion request management. All admin actions should be logged in audit_log.",
  steps: [
    "Review velocity flags: users with 3+ scans in 60s in the last 7 days.",
    "Investigate in Customer 360 → Scans tab before taking action.",
    "Suspend: set is_suspended = true on user_profiles. Prevents point earning.",
    "POPIA deletion requests (deletion_requests table) must be processed on legal timeline.",
  ],
  warnings: [
    "is_suspended = true prevents earning but does not block login.",
    "POPIA deletion requests have legal processing requirements — process promptly.",
    "audit_log entries require auth_is_admin() — confirm admin session before logging.",
  ],
  dataFlow: [
    "get_scan_velocity_flags() SECURITY DEFINER RPC → flags",
    "user_profiles → anomaly_score, is_suspended",
    "audit_log → admin actions (admin_id FK, action, target_type, target_id, details JSONB)",
    "deletion_requests → POPIA workflow (user_id, status: pending/processed)",
  ],
  tips: [
    "anomaly_score is more reliable than a single flag. Look for patterns.",
  ],
};

export const GUIDE_ADMIN_ANALYTICS = {
  tabId: "admin-analytics",
  title: "Admin Analytics",
  description:
    "Shop-level scan analytics. ALL data from scan_logs (NOT legacy scans table). Shows QR performance, geo heatmap for this tenant's customers, device/browser breakdown. scanService.getScanGeoAnalytics() is the correct function.",
  steps: [
    "Scan volume: daily counts from scan_logs.scanned_at for this tenant's QR codes.",
    "Geo heatmap: ip_lat, ip_lng, ip_city, ip_province — populated on every scan.",
    "QR performance: sort by scan_count to find best-performing inserts.",
    "Filter by date range to compare week-over-week.",
  ],
  warnings: [
    "CRITICAL: query scan_logs — NOT legacy scans table. Do not change scanService.getScanGeoAnalytics().",
    "ip_lat/ip_lng may be null if customer uses VPN or privacy browser.",
  ],
  dataFlow: [
    "scan_logs → all analytics (scanned_at, ip_lat, ip_lng, ip_province, device_type, browser)",
    "qr_codes → QR performance (scan_count, claimed)",
    "batches → product name (via batch_id)",
    "scanService.getScanGeoAnalytics() → the geo query function",
  ],
  tips: [
    "If >80% mobile, WP-J mobile responsiveness is your top pre-launch priority.",
    "High scan_count + low claimed rate = customers scanning same QR multiple times (already have it claimed).",
  ],
};

export const GUIDE_ADMIN_NOTIFICATIONS = {
  tabId: "admin-notifications",
  title: "Notifications Log",
  description:
    "Delivery log for all outbound WhatsApp and email notifications. This is READ-ONLY — not a messaging channel. All entries written by the send-notification Edge Function. Use this to diagnose delivery failures.",
  steps: [
    "Filter by status = 'failed' to find undelivered notifications.",
    "Failed WhatsApp = likely Twilio issue (token expired, sandbox, or wrong SA number).",
    "Failed email = email provider not configured (Resend/SendGrid API key missing).",
    "Check the error column for the raw Twilio/provider error message.",
    "trigger column shows what caused each notification: scan_confirmed, order_confirmed, birthday_bonus, otp_request, admin_reply, ticket_resolved.",
  ],
  warnings: [
    "This is a LOG — not a channel. Use Comms tab to send messages.",
    "Twilio is in SANDBOX mode — only recipients who joined sandbox can receive. Switch to production for real customers.",
    "ADMIN_WHATSAPP_TO is still set to NZ number (+64210301406) — all admin WhatsApp goes to wrong destination. Update Supabase secrets.",
  ],
  dataFlow: [
    "notification_log → delivery records (type, trigger, recipient, status, error, tenant_id)",
    "send-notification Edge Function → writes here after every delivery attempt",
  ],
  tips: [
    "If all notifications failing: check Twilio auth token first — may need rotating at console.twilio.com.",
  ],
};

export const GUIDE_ADMIN_STOCK = {
  tabId: "admin-stock",
  title: "Stock Control",
  description:
    "Live inventory management. Uses inventory_items (ACTIVE, 37 rows) — NOT the legacy inventory table (3 rows). Stock movements tracked in stock_movements with full audit trail. Sale deductions happen automatically via payfast-itn on payment.",
  steps: [
    "View inventory_items grouped by category: finished_product, raw_material, packaging, hardware, terpene.",
    "Edit quantity_on_hand inline — creates a stock_movements record (movement_type = 'adjustment').",
    "Low stock indicator: quantity_on_hand ≤ reorder_level → feeds HQ Reorder Scoring.",
    "Movement log: purchase_in, sale_out, adjustment, production_use, production_output.",
  ],
  warnings: [
    "CRITICAL: use inventory_items (37 rows, ACTIVE). Do NOT use legacy inventory table (3 rows).",
    "order_items.line_total is a GENERATED COLUMN — never INSERT it.",
    "Do not manually deduct stock when an order is placed — payfast-itn does this automatically on payment.",
    "inventory_items HAS updated_at (set by trg_inventory_updated trigger) — safe to include in SELECT.",
  ],
  dataFlow: [
    "inventory_items → stock (sku, name, category ENUM, quantity_on_hand, reorder_level, sell_price, is_active)",
    "stock_movements → audit trail (item_id, quantity, movement_type ENUM, reference, performed_by)",
    "orders + order_items → sale_out movements (via payfast-itn)",
    "production_runs → production_use + production_output movements",
  ],
  tips: [
    "Keep sell_price current on finished_product items — it's what shows in Shop AND feeds HQ P&L revenue calculations.",
    "sku field has unique index — use meaningful SKU codes for cross-referencing.",
  ],
};

export const GUIDE_ADMIN_DOCUMENTS = {
  tabId: "admin-documents",
  title: "Documents",
  description:
    "Shop-level document storage. COA PDFs uploaded here link to batches via document_log. Links batch.coa_document_id → document_log.id, enabling product verification at /verify/:batchId.",
  steps: [
    "Upload COA PDFs for product batches — enables customer product verification.",
    "After AI extraction and confirmation: document_log.id is set as batches.coa_document_id.",
    "Filter by document_type: coa, invoice, delivery_note, lab_report.",
    "status values: pending_review → confirmed or rejected.",
  ],
  warnings: [
    "COA uploads only auto-link to batch if batch_number appears in the document. Verify the link.",
    "document_log is tenant-scoped (RLS) — only visible to this tenant (HQ can see all).",
  ],
  dataFlow: [
    "document_log → registry (document_type, file_url, extracted_data JSONB, confidence_score, status)",
    "batches → coa_document_id FK → document_log.id",
    "process-document Edge Function → Claude Vision AI extraction",
  ],
  tips: [
    "Upload and link COA before generating QR codes — scan result page shows COA data from the linked document.",
  ],
};
