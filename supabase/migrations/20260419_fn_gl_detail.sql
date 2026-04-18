-- WP-FIN-004 PR 2 — GL Detail function
-- Double-entry expansion: each source row produces the GL lines it represents.
-- One dispensing_log event = 2 lines (revenue credit + COGS debit).
-- Each GL line traces to exactly one leg of a real double-entry transaction.
-- SECURITY DEFINER with user_tenant_id() / is_hq_user() check (LL-300).

CREATE OR REPLACE FUNCTION public.fn_gl_detail(
  p_tenant_id      uuid,
  p_financial_year text,
  p_account_code   text    DEFAULT NULL,  -- NULL = all accounts
  p_limit          integer DEFAULT 10000
)
RETURNS TABLE (
  transaction_date  date,
  source_table      text,
  source_id         uuid,
  account_code      text,
  account_name      text,
  description       text,
  reference         text,
  debit_amount      numeric,
  credit_amount     numeric,
  running_balance   numeric,
  truncated         boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fy_year    int;
  v_start      date;
  v_end        date;
  v_industry   text;
  v_vat_rate   numeric := 1.15;
  v_total_rows bigint;
BEGIN
  -- Access check (LL-300)
  IF NOT (user_tenant_id() = p_tenant_id OR is_hq_user()) THEN
    RAISE EXCEPTION 'Access denied: user does not belong to tenant %', p_tenant_id;
  END IF;

  v_fy_year := REPLACE(p_financial_year, 'FY', '')::int;
  v_start   := (v_fy_year || '-01-01')::date;
  v_end     := (v_fy_year || '-12-31')::date;

  SELECT industry_profile INTO v_industry FROM tenants WHERE id = p_tenant_id;

  -- Count total rows first (for truncation flag)
  SELECT COUNT(*) INTO v_total_rows FROM (
    -- Revenue lines (non-dispensary): 1 per order
    SELECT o.id FROM orders o
     WHERE o.tenant_id = p_tenant_id AND o.status NOT IN ('cancelled','failed')
       AND o.created_at::date >= v_start AND o.created_at::date <= v_end
       AND v_industry != 'cannabis_dispensary'
       AND (p_account_code IS NULL OR p_account_code = '40000')
    UNION ALL
    -- COGS lines (non-dispensary): 1 per order with COGS data
    SELECT o.id FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.tenant_id = p_tenant_id AND o.status NOT IN ('cancelled','failed')
       AND o.created_at::date >= v_start AND o.created_at::date <= v_end
       AND oi.product_metadata->>'weighted_avg_cost' IS NOT NULL
       AND v_industry != 'cannabis_dispensary'
       AND (p_account_code IS NULL OR p_account_code = '50000')
    UNION ALL
    -- Dispensary revenue: 1 per dispensing event
    SELECT dl.id FROM dispensing_log dl
     WHERE dl.tenant_id = p_tenant_id AND dl.is_voided = false
       AND dl.dispensed_at::date >= v_start AND dl.dispensed_at::date <= v_end
       AND v_industry = 'cannabis_dispensary'
       AND (p_account_code IS NULL OR p_account_code = '40000')
    UNION ALL
    -- Dispensary COGS: 1 per dispensing event
    SELECT dl.id FROM dispensing_log dl
     WHERE dl.tenant_id = p_tenant_id AND dl.is_voided = false
       AND dl.dispensed_at::date >= v_start AND dl.dispensed_at::date <= v_end
       AND v_industry = 'cannabis_dispensary'
       AND (p_account_code IS NULL OR p_account_code = '50000')
    UNION ALL
    -- Expenses: 1 per expense
    SELECT e.id FROM expenses e
     WHERE e.tenant_id = p_tenant_id AND e.category IN ('opex','wages','tax','other')
       AND e.expense_date >= v_start AND e.expense_date <= v_end
       AND (p_account_code IS NULL OR p_account_code = COALESCE((SELECT m.account_code FROM expense_subcategory_account_map m WHERE m.subcategory = e.subcategory), '61900'))
    UNION ALL
    -- Depreciation expense: 1 per entry
    SELECT de.id FROM depreciation_entries de
     WHERE de.tenant_id = p_tenant_id AND de.period_year = v_fy_year
       AND (p_account_code IS NULL OR p_account_code = '61100')
    UNION ALL
    -- Depreciation accum dep credit: 1 per entry
    SELECT de.id FROM depreciation_entries de
     WHERE de.tenant_id = p_tenant_id AND de.period_year = v_fy_year
       AND (p_account_code IS NULL OR p_account_code = '15100')
    UNION ALL
    -- Bank statement lines: 1 per line
    SELECT bsl.id FROM bank_statement_lines bsl
     JOIN bank_accounts ba ON ba.id = bsl.bank_account_id
     WHERE ba.tenant_id = p_tenant_id AND ba.is_active = true
       AND bsl.statement_date >= v_start AND bsl.statement_date <= v_end
       AND (p_account_code IS NULL OR p_account_code = '10100')
    UNION ALL
    -- VAT transactions: 1 per row
    SELECT vt.id FROM vat_transactions vt
     WHERE vt.tenant_id = p_tenant_id
       AND vt.transaction_date >= v_start AND vt.transaction_date <= v_end
       AND (p_account_code IS NULL OR p_account_code IN ('20100','11100'))
    UNION ALL
    -- Manual journal lines
    SELECT jl.id FROM journal_lines jl JOIN journal_entries je ON je.id = jl.journal_id
     WHERE je.tenant_id = p_tenant_id AND je.status = 'posted'
       AND je.journal_date >= v_start AND je.journal_date <= v_end
       AND je.journal_type NOT IN ('depreciation','general','purchase')
       AND (p_account_code IS NULL OR jl.account_code = p_account_code)
  ) counting;

  RETURN QUERY
  WITH gl_lines AS (
    -- ── Revenue (non-dispensary): credit to 40000 ──────────────────
    SELECT
      o.created_at::date AS txn_date, 'orders' AS src, o.id AS src_id,
      '40000' AS ac,
      'Revenue — ' || COALESCE(o.channel, 'POS') AS descr,
      COALESCE(o.order_ref, '') AS ref,
      0::numeric AS dr,
      ROUND(o.total / v_vat_rate, 2) AS cr
    FROM orders o
    WHERE o.tenant_id = p_tenant_id AND o.status NOT IN ('cancelled','failed')
      AND o.created_at::date >= v_start AND o.created_at::date <= v_end
      AND v_industry != 'cannabis_dispensary'
      AND (p_account_code IS NULL OR p_account_code = '40000')

    UNION ALL
    -- ── COGS (non-dispensary): debit to 50000 ──────────────────────
    SELECT
      o.created_at::date, 'order_items', oi.id,
      '50000',
      'COGS — ' || oi.product_name,
      COALESCE(o.order_ref, ''),
      ROUND((oi.product_metadata->>'weighted_avg_cost')::numeric * oi.quantity, 2),
      0
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.tenant_id = p_tenant_id AND o.status NOT IN ('cancelled','failed')
      AND o.created_at::date >= v_start AND o.created_at::date <= v_end
      AND oi.product_metadata->>'weighted_avg_cost' IS NOT NULL
      AND v_industry != 'cannabis_dispensary'
      AND (p_account_code IS NULL OR p_account_code = '50000')

    UNION ALL
    -- ── Revenue (dispensary): credit to 40000 ──────────────────────
    SELECT
      dl.dispensed_at::date, 'dispensing_log', dl.id,
      '40000',
      'Dispensing revenue',
      '',
      0,
      ROUND(dl.quantity_dispensed * ii.sell_price, 2)
    FROM dispensing_log dl
    JOIN inventory_items ii ON ii.id = dl.inventory_item_id
    WHERE dl.tenant_id = p_tenant_id AND dl.is_voided = false
      AND dl.dispensed_at::date >= v_start AND dl.dispensed_at::date <= v_end
      AND v_industry = 'cannabis_dispensary'
      AND (p_account_code IS NULL OR p_account_code = '40000')

    UNION ALL
    -- ── COGS (dispensary): debit to 50000 ──────────────────────────
    SELECT
      dl.dispensed_at::date, 'dispensing_log', dl.id,
      '50000',
      'Dispensing COGS',
      '',
      ROUND(dl.quantity_dispensed * COALESCE(ii.weighted_avg_cost, ii.cost_price), 2),
      0
    FROM dispensing_log dl
    JOIN inventory_items ii ON ii.id = dl.inventory_item_id
    WHERE dl.tenant_id = p_tenant_id AND dl.is_voided = false
      AND dl.dispensed_at::date >= v_start AND dl.dispensed_at::date <= v_end
      AND v_industry = 'cannabis_dispensary'
      AND (p_account_code IS NULL OR p_account_code = '50000')

    UNION ALL
    -- ── Expenses: debit to mapped account ──────────────────────────
    SELECT
      e.expense_date, 'expenses', e.id,
      COALESCE(m.account_code, '61900'),
      COALESCE(e.subcategory, e.category) || ' — ' || COALESCE(e.description, ''),
      '',
      ROUND(e.amount_zar, 2),
      0
    FROM expenses e
    LEFT JOIN expense_subcategory_account_map m ON m.subcategory = e.subcategory
    WHERE e.tenant_id = p_tenant_id AND e.category IN ('opex','wages','tax','other')
      AND e.expense_date >= v_start AND e.expense_date <= v_end
      AND (p_account_code IS NULL OR p_account_code = COALESCE(m.account_code, '61900'))

    UNION ALL
    -- ── Depreciation expense: debit to 61100 ───────────────────────
    SELECT
      (de.period_year || '-' || LPAD(de.period_month, 2, '0') || '-01')::date,
      'depreciation_entries', de.id,
      '61100',
      'Depreciation — ' || COALESCE(fa.asset_name, ''),
      '',
      ROUND(de.depreciation, 2),
      0
    FROM depreciation_entries de
    LEFT JOIN fixed_assets fa ON fa.id = de.asset_id
    WHERE de.tenant_id = p_tenant_id AND de.period_year = v_fy_year
      AND (p_account_code IS NULL OR p_account_code = '61100')

    UNION ALL
    -- ── Depreciation accum dep: credit to 15100 ────────────────────
    SELECT
      (de.period_year || '-' || LPAD(de.period_month, 2, '0') || '-01')::date,
      'depreciation_entries', de.id,
      '15100',
      'Accum dep — ' || COALESCE(fa.asset_name, ''),
      '',
      0,
      ROUND(de.depreciation, 2)
    FROM depreciation_entries de
    LEFT JOIN fixed_assets fa ON fa.id = de.asset_id
    WHERE de.tenant_id = p_tenant_id AND de.period_year = v_fy_year
      AND (p_account_code IS NULL OR p_account_code = '15100')

    UNION ALL
    -- ── Bank statement lines: debit or credit to 10100 ─────────────
    SELECT
      bsl.statement_date, 'bank_statement_lines', bsl.id,
      '10100',
      COALESCE(bsl.description, ''),
      COALESCE(bsl.reference, ''),
      ROUND(bsl.credit_amount, 2),   -- bank credit = cash debit (money in)
      ROUND(bsl.debit_amount, 2)     -- bank debit = cash credit (money out)
    FROM bank_statement_lines bsl
    JOIN bank_accounts ba ON ba.id = bsl.bank_account_id
    WHERE ba.tenant_id = p_tenant_id AND ba.is_active = true
      AND bsl.statement_date >= v_start AND bsl.statement_date <= v_end
      AND (p_account_code IS NULL OR p_account_code = '10100')

    UNION ALL
    -- ── VAT transactions: credit (payable) or debit (receivable) ───
    SELECT
      vt.transaction_date, 'vat_transactions', vt.id,
      CASE WHEN (vt.output_vat - vt.input_vat) >= 0 THEN '20100' ELSE '11100' END,
      'VAT — ' || vt.transaction_type || ' (' || vt.source_table || ')',
      '',
      CASE WHEN (vt.output_vat - vt.input_vat) < 0 THEN ROUND(ABS(vt.output_vat - vt.input_vat), 2) ELSE 0 END,
      CASE WHEN (vt.output_vat - vt.input_vat) >= 0 THEN ROUND(vt.output_vat - vt.input_vat, 2) ELSE 0 END
    FROM vat_transactions vt
    WHERE vt.tenant_id = p_tenant_id
      AND vt.transaction_date >= v_start AND vt.transaction_date <= v_end
      AND (p_account_code IS NULL OR p_account_code IN ('20100','11100'))

    UNION ALL
    -- ── Manual journal lines (non-auto-generated) ──────────────────
    SELECT
      je.journal_date, 'journal_lines', jl.id,
      jl.account_code,
      COALESCE(je.description, ''),
      COALESCE(je.reference, ''),
      ROUND(jl.debit_amount, 2),
      ROUND(jl.credit_amount, 2)
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_id
    WHERE je.tenant_id = p_tenant_id AND je.status = 'posted'
      AND je.journal_date >= v_start AND je.journal_date <= v_end
      AND je.journal_type NOT IN ('depreciation','general','purchase')
      AND (p_account_code IS NULL OR jl.account_code = p_account_code)
  ),
  -- Add account names and running balance
  numbered AS (
    SELECT
      gl.txn_date AS transaction_date,
      gl.src AS source_table,
      gl.src_id AS source_id,
      gl.ac AS account_code,
      COALESCE(coa.account_name, gl.ac) AS account_name,
      gl.descr AS description,
      gl.ref AS reference,
      gl.dr AS debit_amount,
      gl.cr AS credit_amount,
      SUM(gl.dr - gl.cr) OVER (
        PARTITION BY gl.ac
        ORDER BY gl.txn_date, gl.src_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS running_balance,
      ROW_NUMBER() OVER (ORDER BY gl.txn_date, gl.ac, gl.src_id) AS rn
    FROM gl_lines gl
    LEFT JOIN chart_of_accounts coa ON coa.account_code = gl.ac AND coa.tenant_id = p_tenant_id
  )
  SELECT
    n.transaction_date, n.source_table, n.source_id,
    n.account_code, n.account_name, n.description, n.reference,
    n.debit_amount, n.credit_amount,
    ROUND(n.running_balance, 2),
    (n.rn = p_limit AND v_total_rows > p_limit)::boolean AS truncated
  FROM numbered n
  WHERE n.rn <= p_limit
  ORDER BY n.transaction_date, n.account_code, n.source_id;
END;
$$;

COMMENT ON FUNCTION public.fn_gl_detail IS
'WP-FIN-004 PR 2: GL Detail with double-entry expansion. Each source row produces '
'the GL lines it represents (dispensing = revenue + COGS, depreciation = expense + accum dep). '
'Truncates at p_limit with flag. SECURITY DEFINER with LL-300 access check.';

GRANT EXECUTE ON FUNCTION public.fn_gl_detail TO authenticated;
