# SCHEMA-REFERENCE.md
## NuAi Production Schema -- Generated 14 April 2026
## Update by appending when new tables are added via migration
## Source: information_schema.columns on uvicrqapgzcdvozxrreo

---

## Frequently wrong table names -- correct versions

| Wrong name (never use) | Correct production name |
|---|---|
| stock_items | inventory_items |
| vat_configurations | tenant_config (has vat_number, vat_rate, vat_period cols) |
| stock_items.avco_cost | inventory_items.weighted_avg_cost |
| orders status='completed' | orders status='paid' (values: paid/cancelled/pending) |
| bank_reconciliation_transactions | bank_statement_lines |
| journal_lines.journal_entry_id | journal_lines.journal_id |
| depreciation_entries.depreciation_amount | depreciation_entries.depreciation |
| expenses.amount | expenses.amount_zar |
| tenants.active | tenants.is_active |
| fixed_assets.cost_price | fixed_assets.purchase_cost |

## Canonical RPCs (use these for financial figures -- LL-210)

- tenant_financial_period(p_tenant_id uuid, p_since timestamptz, p_until timestamptz) -> jsonb
- hq_financial_period(p_since timestamptz, p_until timestamptz, p_industry_filter text) -> jsonb
- tenant_vat_periods(p_tenant_id uuid, p_year int) -> jsonb
- get_tenant_orders_for_pl(p_tenant_id uuid, p_since timestamptz, p_until timestamptz)

## Key tables -- confirmed production column names

### inventory_items
id, sku, name, category, unit, description, quantity_on_hand, reorder_level,
cost_price, sell_price, supplier_id, batch_number, expiry_date, is_active,
tenant_id, weighted_avg_cost, image_url, subcategory, brand

### orders
id, tenant_id, user_id, order_ref, status, total, currency, payment_method,
items_count, notes, created_at, updated_at, channel
NOTE: status='paid' is correct filter for revenue -- NOT 'completed'

### order_items
id, order_id, product_name, quantity, unit_price, line_total, product_metadata, created_at

### stock_movements
id, item_id, tenant_id, quantity, movement_type, reference, notes, created_at, unit_cost, batch_id

### journal_entries
id, tenant_id, journal_date, reference, description, journal_type, status, financial_year, created_at
NOTE: status values: draft/posted/reversed

### journal_lines
id, journal_id, tenant_id, account_code, account_name, debit_amount, credit_amount, description, line_order
NOTE: join on journal_lines.journal_id = journal_entries.id (NOT journal_entry_id)

### bank_statement_lines
id, bank_account_id, tenant_id, statement_date, description, reference,
debit_amount, credit_amount, balance, matched_type, matched_id, matched_at

### tenant_config
id, tenant_id, tier, financial_setup_complete, trading_name, vat_registered,
vat_number, vat_period, vat_basis, vat_rate, financial_year_start, financial_year_end,
company_reg_number, income_tax_number, registered_address,
auditor_name, auditor_firm, auditor_email, accounting_basis
NOTE: No separate vat_configurations table exists

### vat_transactions
id, tenant_id, transaction_date, transaction_type, source_table, source_id,
vat_period, output_vat, input_vat, exclusive_amount, inclusive_amount, vat_rate
NOTE: 0 rows with source_table='orders' -- POS VAT pipeline broken

### equity_ledger
id, tenant_id, financial_year, share_capital, opening_retained_earnings,
net_profit_for_year, dividends_declared, year_end_closed
NOTE: net_profit_for_year is NULL for all tenants (known bug)

### expenses
id, tenant_id, expense_date, category, subcategory, description,
amount_zar, input_vat_amount, payment_status, paid_date, matched_bank_line_id

### fixed_assets
id, tenant_id, asset_name, asset_category, asset_code, purchase_date,
purchase_cost, residual_value, useful_life_years, depreciation_method,
accumulated_depreciation, net_book_value, is_active
NOTE: column is purchase_cost NOT cost_price

### chart_of_accounts
id, tenant_id, account_code, account_name, account_type, account_subtype, is_active, template

---

## Full table list (109 tables)

| Table | Columns |
|---|---|
| ai_usage_log | id, tenant_id, user_id, model, query_type, prompt_tokens, completion_tokens, total_tokens, cost_usd, tab_context, success, error_message, created_at |
| audit_log | id, admin_id, action, target_type, target_id, details, created_at |
| bank_accounts | id, tenant_id, bank_name, account_name, account_number, branch_code, account_type, currency, opening_balance, opening_date, is_active, is_primary, created_at |
| bank_statement_lines | id, bank_account_id, tenant_id, statement_date, description, reference, debit_amount, credit_amount, balance, matched_type, matched_id, matched_at, import_batch, created_at |
| batches | id, batch_number, product_name, product_type, strain, volume, production_date, expiry_date, units_produced, thc_content, cbd_content, lab_certified, status, tenant_id, is_archived, lifecycle_status, inventory_item_id, section_21_number, cannabinoid_profile |
| capture_queue | id, tenant_id, captured_by, captured_at, document_log_id, file_url, status, is_duplicate, fraud_flags |
| chart_of_accounts | id, tenant_id, account_code, account_name, account_type, account_subtype, is_active, template, created_at |
| cold_chain_locations | id, tenant_id, name, location_type, min_limit_c, max_limit_c, is_active |
| depreciation_entries | id, tenant_id, asset_id, period_month, period_year, depreciation, accum_dep_after, nbv_after, posted_at |
| dispensing_log | id, prescription_id, patient_id, tenant_id, batch_id, inventory_item_id, quantity_dispensed, dispensed_by, dispensed_at, is_voided, void_reason |
| eod_cash_ups | id, tenant_id, cashup_date, system_cash_total, counted_cash, variance, status, notes, created_at |
| equity_ledger | id, tenant_id, financial_year, share_capital, opening_retained_earnings, net_profit_for_year, dividends_declared, year_end_closed |
| expenses | id, tenant_id, expense_date, category, subcategory, description, amount_zar, input_vat_amount, payment_status, paid_date, matched_bank_line_id |
| fixed_assets | id, tenant_id, asset_name, asset_category, purchase_date, purchase_cost, residual_value, useful_life_years, accumulated_depreciation, net_book_value, is_active |
| inventory_items | id, sku, name, category, unit, quantity_on_hand, reorder_level, cost_price, sell_price, weighted_avg_cost, is_active, tenant_id |
| invoices | id, tenant_id, invoice_number, invoice_type, status, total_amount, vat_amount |
| journal_entries | id, tenant_id, journal_date, reference, description, journal_type, status, financial_year |
| journal_lines | id, journal_id, tenant_id, account_code, account_name, debit_amount, credit_amount, description |
| leave_requests | id, staff_profile_id, tenant_id, start_date, end_date, days_requested, status |
| loyalty_transactions | id, user_id, points, transaction_type, tenant_id, created_at |
| order_items | id, order_id, product_name, quantity, unit_price, line_total, product_metadata |
| orders | id, tenant_id, user_id, order_ref, status, total, currency, payment_method, items_count, notes, created_at, channel |
| patients | id, tenant_id, name, id_number, is_active, section_21_number, s21_expiry_date |
| pos_sessions | id, tenant_id, session_date, opening_float, status, notes |
| prescriptions | id, patient_id, tenant_id, substance, repeats, repeats_used, expiry_date, is_active |
| purchase_orders | id, po_number, supplier_id, status, po_status, subtotal, landed_cost_zar, tenant_id |
| staff_profiles | id, user_id, tenant_id, employee_number, full_name, job_title, status |
| stock_movements | id, item_id, tenant_id, quantity, movement_type, unit_cost, reference, notes, created_at |
| supplier_products | id, supplier_id, name, category, unit_price_usd, is_active |
| suppliers | id, name, contact_name, email, is_active, tenant_id |
| tenant_config | id, tenant_id, tier, financial_setup_complete, trading_name, vat_registered, vat_number, vat_period, vat_rate, financial_year_start, accounting_basis |
| tenants | id, name, industry_profile, is_active, created_at, currency |
| user_profiles | id, full_name, email, role, hq_access, tenant_id |
| vat_period_filings | id, tenant_id, period_id, filed_at, submission_ref |
| vat_transactions | id, tenant_id, transaction_date, vat_period, output_vat, input_vat, source_table, source |

---
*Generated 14 April 2026 -- NuAi -- Update when migrations add new tables*
