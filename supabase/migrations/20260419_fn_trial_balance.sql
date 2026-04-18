-- WP-FIN-004 PR 1 — Trial Balance engine
-- fn_trial_balance: derives TB from operational tables (NOT journal_lines alone).
-- journal_lines layers on top as manual adjustments.
-- Honours LL-231: dispensary revenue from dispensing_log, not orders.
-- SECURITY DEFINER with explicit user_tenant_id() / is_hq_user() check (LL-300).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Expense subcategory → account_code mapping table (planner refinement #2)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.expense_subcategory_account_map (
  subcategory  text PRIMARY KEY,
  account_code text NOT NULL,
  account_name text NOT NULL
);

COMMENT ON TABLE public.expense_subcategory_account_map IS
'WP-FIN-004: single source of truth for expense subcategory → GL account mapping. '
'Seeded from HQProfitLoss.js SUBCATEGORY_TO_ACCOUNT. fn_trial_balance LEFT JOINs here '
'when expenses.account_code IS NULL. Future WP-COA-MAP-UNIFY migrates React to read from this table.';

-- Seed from HQProfitLoss.js lines 43-70 (exact copy)
INSERT INTO public.expense_subcategory_account_map (subcategory, account_code, account_name) VALUES
  ('Rent & Premises',              '60000', 'Rent and occupancy costs'),
  ('Staff Wages',                  '60100', 'Employee benefits expense'),
  ('Security',                     '60200', 'Security services'),
  ('Utilities',                    '60300', 'Utilities'),
  ('Insurance',                    '60400', 'Insurance expense'),
  ('Marketing',                    '60500', 'Marketing and advertising'),
  ('Packaging',                    '60600', 'Packaging materials'),
  ('Banking & Fees',               '60700', 'Finance charges and bank fees'),
  ('Software',                     '60800', 'Software and subscriptions'),
  ('Professional Fees',            '60900', 'Professional fees'),
  ('Cleaning & Hygiene',           '61000', 'Cleaning and hygiene'),
  ('Equipment',                    '61900', 'Other operating expenses'),
  -- cannabis_dispensary
  ('SAHPRA Licensing Fees',        '60150', 'Regulatory licensing fees'),
  ('Pharmacist Salary',            '60110', 'Employee benefits — responsible pharmacist'),
  ('Cold Chain Equipment',         '61500', 'Medical equipment and maintenance'),
  ('Professional Indemnity',       '60410', 'Professional indemnity insurance'),
  ('Patient Education Materials',  '60510', 'Clinical education materials'),
  ('Controlled Substance Security','60210', 'Controlled substance security'),
  -- food_beverage
  ('Produce & Ingredients',        '50100', 'Raw material — food ingredients'),
  ('Kitchen Wages',                '60105', 'Employee benefits — kitchen and FOH staff'),
  ('Gas & Cooking Fuel',           '60305', 'Gas and cooking fuel'),
  ('FSCA Compliance Fees',         '60155', 'Food safety compliance and certification fees'),
  ('Cleaning & Hygiene Supplies',  '61005', 'Cleaning and hygiene materials'),
  ('Equipment Maintenance',        '61505', 'Kitchen equipment maintenance and calibration')
ON CONFLICT (subcategory) DO NOTHING;

-- No RLS needed — this is a reference table, not tenant-scoped.
-- Grant read to authenticated for future React reads.
GRANT SELECT ON public.expense_subcategory_account_map TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. fn_trial_balance
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_trial_balance(
  p_tenant_id      uuid,
  p_financial_year text  -- 'FY2026' | 'FY2025' etc.
)
RETURNS TABLE (
  account_code    text,
  account_name    text,
  account_type    text,
  account_subtype text,
  opening_debit   numeric,
  opening_credit  numeric,
  period_debit    numeric,
  period_credit   numeric,
  closing_debit   numeric,
  closing_credit  numeric,
  source_count    integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fy_year       int;
  v_start         date;
  v_end           date;
  v_industry      text;
  v_vat_rate      numeric := 1.15;
BEGIN
  -- ── Access check (LL-300) ──────────────────────────────────────────────
  -- Access check using LL-300 helpers
  IF NOT (user_tenant_id() = p_tenant_id OR is_hq_user()) THEN
    RAISE EXCEPTION 'Access denied: user does not belong to tenant %', p_tenant_id;
  END IF;

  -- ── Parse FY bounds ────────────────────────────────────────────────────
  v_fy_year := REPLACE(p_financial_year, 'FY', '')::int;
  v_start   := (v_fy_year || '-01-01')::date;
  v_end     := (v_fy_year || '-12-31')::date;

  -- ── Get industry profile ───────────────────────────────────────────────
  SELECT industry_profile INTO v_industry
    FROM tenants WHERE id = p_tenant_id;

  -- ══════════════════════════════════════════════════════════════════════
  -- Build TB from operational tables + journal overlay
  -- ══════════════════════════════════════════════════════════════════════

  RETURN QUERY
  WITH
  -- ── Revenue (40000-49999) ──────────────────────────────────────────
  cte_revenue AS (
    -- Non-dispensary: from orders (mirrors tenant_financial_period)
    SELECT '40000' AS ac, SUM(o.total / v_vat_rate) AS amt, COUNT(*)::int AS cnt
      FROM orders o
     WHERE o.tenant_id = p_tenant_id
       AND o.status NOT IN ('cancelled','failed')
       AND o.created_at::date >= v_start AND o.created_at::date <= v_end
       AND v_industry != 'cannabis_dispensary'
    UNION ALL
    -- Dispensary: from dispensing_log × sell_price (LL-231)
    SELECT '40000' AS ac,
           SUM(dl.quantity_dispensed * ii.sell_price) AS amt,
           COUNT(*)::int AS cnt
      FROM dispensing_log dl
      JOIN inventory_items ii ON ii.id = dl.inventory_item_id
     WHERE dl.tenant_id = p_tenant_id
       AND dl.is_voided = false
       AND dl.dispensed_at::date >= v_start AND dl.dispensed_at::date <= v_end
       AND v_industry = 'cannabis_dispensary'
  ),

  -- ── COGS (50000) ──────────────────────────────────────────────────
  cte_cogs AS (
    -- Non-dispensary: order_items × product_metadata weighted_avg_cost
    SELECT '50000' AS ac,
           SUM((oi.product_metadata->>'weighted_avg_cost')::numeric * oi.quantity) AS amt,
           COUNT(*)::int AS cnt
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
     WHERE o.tenant_id = p_tenant_id
       AND o.status NOT IN ('cancelled','failed')
       AND o.created_at::date >= v_start AND o.created_at::date <= v_end
       AND oi.product_metadata->>'weighted_avg_cost' IS NOT NULL
       AND v_industry != 'cannabis_dispensary'
    UNION ALL
    -- Dispensary COGS: dispensing_log × weighted_avg_cost
    SELECT '50000' AS ac,
           SUM(dl.quantity_dispensed * COALESCE(ii.weighted_avg_cost, ii.cost_price)) AS amt,
           COUNT(*)::int AS cnt
      FROM dispensing_log dl
      JOIN inventory_items ii ON ii.id = dl.inventory_item_id
     WHERE dl.tenant_id = p_tenant_id
       AND dl.is_voided = false
       AND dl.dispensed_at::date >= v_start AND dl.dispensed_at::date <= v_end
       AND v_industry = 'cannabis_dispensary'
  ),

  -- ── OpEx (60000-69999) — grouped by resolved account_code ─────────
  cte_opex AS (
    SELECT COALESCE(m.account_code, '61900') AS ac,
           SUM(e.amount_zar) AS amt,
           COUNT(*)::int AS cnt
      FROM expenses e
      LEFT JOIN expense_subcategory_account_map m ON m.subcategory = e.subcategory
     WHERE e.tenant_id = p_tenant_id
       AND e.category IN ('opex','wages','tax','other')
       AND e.expense_date >= v_start AND e.expense_date <= v_end
     GROUP BY COALESCE(m.account_code, '61900')
  ),

  -- ── Depreciation expense (61100) — period charge from entries ────
  cte_dep_expense AS (
    SELECT '61100' AS ac, SUM(de.depreciation) AS amt, COUNT(*)::int AS cnt
      FROM depreciation_entries de
     WHERE de.tenant_id = p_tenant_id
       AND de.period_year = v_fy_year
  ),

  -- ── PPE cost (15000) + accum dep (15100) from fixed_assets ────────
  -- NOTE: accum dep from fixed_assets.accumulated_depreciation, NOT from
  -- depreciation_entries.accum_dep_after (which sums monthly snapshots).
  -- Negated because 15100 is a contra-asset (credit-normal).
  cte_ppe AS (
    SELECT '15000' AS ac, SUM(fa.purchase_cost) AS amt, COUNT(*)::int AS cnt
      FROM fixed_assets fa
     WHERE fa.tenant_id = p_tenant_id
       AND fa.purchase_date <= v_end
       AND (fa.disposal_date IS NULL OR fa.disposal_date > v_end)
    UNION ALL
    SELECT '15100' AS ac, -SUM(fa.accumulated_depreciation) AS amt, COUNT(*)::int AS cnt
      FROM fixed_assets fa
     WHERE fa.tenant_id = p_tenant_id
       AND fa.purchase_date <= v_end
       AND (fa.disposal_date IS NULL OR fa.disposal_date > v_end)
  ),

  -- ── Inventory (12000) — snapshot at period end ────────────────────
  cte_inventory AS (
    SELECT '12000' AS ac,
           SUM(ii.quantity_on_hand * COALESCE(ii.weighted_avg_cost, ii.cost_price, 0)) AS amt,
           COUNT(*)::int AS cnt
      FROM inventory_items ii
     WHERE ii.tenant_id = p_tenant_id
       AND ii.quantity_on_hand > 0
       AND ii.is_active = true
  ),

  -- ── Cash (10100 bank) ─────────────────────────────────────────────
  cte_cash AS (
    SELECT '10100' AS ac,
           SUM(
             ba.opening_balance
             + COALESCE((SELECT SUM(bsl.credit_amount - bsl.debit_amount)
                           FROM bank_statement_lines bsl
                          WHERE bsl.bank_account_id = ba.id
                            AND bsl.statement_date >= v_start
                            AND bsl.statement_date <= v_end), 0)
           ) AS amt,
           COUNT(*)::int AS cnt
      FROM bank_accounts ba
     WHERE ba.tenant_id = p_tenant_id
       AND ba.is_active = true
  ),

  -- ── Trade Receivables (11000) — unpaid invoices ───────────────────
  cte_receivables AS (
    SELECT '11000' AS ac,
           SUM(i.total_amount) AS amt,
           COUNT(*)::int AS cnt
      FROM invoices i
     WHERE i.tenant_id = p_tenant_id
       AND i.status IN ('sent','overdue')
       AND i.invoice_date <= v_end
  ),

  -- ── Trade Payables (20000) — outstanding POs ──────────────────────
  cte_payables AS (
    SELECT '20000' AS ac,
           SUM(po.landed_cost_zar) AS amt,
           COUNT(*)::int AS cnt
      FROM purchase_orders po
     WHERE po.tenant_id = p_tenant_id
       AND po.status NOT IN ('received','cancelled','complete')
  ),

  -- ── VAT (20100 payable / 11100 receivable) ────────────────────────
  cte_vat AS (
    SELECT
      CASE WHEN SUM(vt.output_vat - vt.input_vat) >= 0 THEN '20100' ELSE '11100' END AS ac,
      ABS(SUM(vt.output_vat - vt.input_vat)) AS amt,
      COUNT(*)::int AS cnt
    FROM vat_transactions vt
    WHERE vt.tenant_id = p_tenant_id
      AND vt.transaction_date >= v_start AND vt.transaction_date <= v_end
  ),

  -- ── Equity (30000 share capital, 30100 retained earnings) ───────────
  -- NOTE: 30200 (Current Year P/L) EXCLUDED from pre-closing TB.
  -- Revenue and expense accounts are shown individually; including
  -- 30200 would double-count the IS activity.
  cte_equity AS (
    SELECT '30000' AS ac, COALESCE(el.share_capital, 0) AS amt, 1 AS cnt
      FROM equity_ledger el
     WHERE el.tenant_id = p_tenant_id AND el.financial_year = p_financial_year
    UNION ALL
    SELECT '30100' AS ac, COALESCE(el.opening_retained_earnings, 0) AS amt, 1 AS cnt
      FROM equity_ledger el
     WHERE el.tenant_id = p_tenant_id AND el.financial_year = p_financial_year
  ),

  -- ── Journal overlay (manual adjustments) ──────────────────────────
  cte_journal AS (
    SELECT jl.account_code AS ac,
           SUM(jl.debit_amount - jl.credit_amount) AS amt,
           COUNT(*)::int AS cnt
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_id
     WHERE je.tenant_id = p_tenant_id
       AND je.status = 'posted'
       AND je.journal_date >= v_start AND je.journal_date <= v_end
       AND je.journal_type NOT IN ('depreciation','general','purchase')
     GROUP BY jl.account_code
  ),

  -- ── Union all sources ─────────────────────────────────────────────
  all_movements AS (
    SELECT ac, amt, cnt FROM cte_revenue   WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_cogs      WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_opex      WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_dep_expense WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_ppe WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_inventory WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_cash      WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_receivables WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_payables  WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_vat       WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_equity    WHERE amt IS NOT NULL AND amt != 0
    UNION ALL
    SELECT ac, amt, cnt FROM cte_journal   WHERE amt IS NOT NULL AND amt != 0
  ),

  -- ── Aggregate by account code ─────────────────────────────────────
  agg AS (
    SELECT m.ac,
           SUM(m.amt) AS total_amt,
           SUM(m.cnt) AS total_cnt
      FROM all_movements m
     GROUP BY m.ac
  )

  -- ── Final: join to chart_of_accounts, apply debit/credit convention ──
  SELECT
    coa.account_code,
    coa.account_name,
    coa.account_type,
    coa.account_subtype,
    -- Opening balances: zero for now (FY opening = prior year closing, requires year-end close)
    0::numeric AS opening_debit,
    0::numeric AS opening_credit,
    -- Period movement: debit-normal for asset/expense, credit-normal for liability/equity/revenue
    CASE
      WHEN coa.account_type IN ('asset','expense') THEN
        CASE WHEN COALESCE(a.total_amt, 0) >= 0 THEN ROUND(COALESCE(a.total_amt, 0), 2) ELSE 0 END
      ELSE -- liability/equity/revenue
        CASE WHEN COALESCE(a.total_amt, 0) < 0 THEN ROUND(ABS(COALESCE(a.total_amt, 0)), 2) ELSE 0 END
    END AS period_debit,
    CASE
      WHEN coa.account_type IN ('asset','expense') THEN
        CASE WHEN COALESCE(a.total_amt, 0) < 0 THEN ROUND(ABS(COALESCE(a.total_amt, 0)), 2) ELSE 0 END
      ELSE -- liability/equity/revenue
        CASE WHEN COALESCE(a.total_amt, 0) >= 0 THEN ROUND(COALESCE(a.total_amt, 0), 2) ELSE 0 END
    END AS period_credit,
    -- Closing = opening + period (opening is 0 for now)
    CASE
      WHEN coa.account_type IN ('asset','expense') THEN
        CASE WHEN COALESCE(a.total_amt, 0) >= 0 THEN ROUND(COALESCE(a.total_amt, 0), 2) ELSE 0 END
      ELSE
        CASE WHEN COALESCE(a.total_amt, 0) < 0 THEN ROUND(ABS(COALESCE(a.total_amt, 0)), 2) ELSE 0 END
    END AS closing_debit,
    CASE
      WHEN coa.account_type IN ('asset','expense') THEN
        CASE WHEN COALESCE(a.total_amt, 0) < 0 THEN ROUND(ABS(COALESCE(a.total_amt, 0)), 2) ELSE 0 END
      ELSE
        CASE WHEN COALESCE(a.total_amt, 0) >= 0 THEN ROUND(COALESCE(a.total_amt, 0), 2) ELSE 0 END
    END AS closing_credit,
    COALESCE(a.total_cnt, 0)::int AS source_count
  FROM chart_of_accounts coa
  LEFT JOIN agg a ON a.ac = coa.account_code
  WHERE coa.tenant_id = p_tenant_id
    AND (a.total_amt IS NOT NULL OR coa.is_active = true)
  ORDER BY coa.account_code;
END;
$$;

COMMENT ON FUNCTION public.fn_trial_balance IS
'WP-FIN-004: Trial Balance engine. Derives from operational tables (orders, dispensing_log, '
'expenses, depreciation_entries, fixed_assets, inventory_items, bank_accounts, invoices, '
'purchase_orders, vat_transactions, equity_ledger) with journal_lines layered as manual '
'adjustments. Honours LL-231 dispensary branch. SECURITY DEFINER with explicit access check.';

GRANT EXECUTE ON FUNCTION public.fn_trial_balance TO authenticated;
