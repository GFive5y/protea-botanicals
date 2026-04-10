# WP-FINANCIAL-PROFILES v1.0
## Profile-Adaptive Financial Suite — All 5 Profiles
## Status: IN PROGRESS — 11 April 2026
## Closes: LL-224 violation (generic P&L across all profiles)

---

## PROBLEM STATEMENT

Every financial page currently ignores industry_profile.
A medical dispensary owner and a café owner see identical P&L templates.
This violates LL-224 and undermines the core CA value proposition.

Critical: cannabis_dispensary P&L shows R0 revenue because the
revenue source is dispensing_log, not the orders table.

---

## SCOPE — FILES CHANGED IN THIS WP

1. src/components/hq/HQProfitLoss.js   — PRIMARY: revenue source, benchmarks, labels
2. src/components/hq/ExpenseManager.js — suggested categories per profile
3. src/components/hq/HQCogs.js         — module title + framing per profile
4. src/pages/TenantPortal.js           — FOOD_BEVERAGE_WATERFALL (long-outstanding gap)
5. src/hooks/useNavConfig.js           — label renames (Finance→Financials, etc.)

---

## PROFILE FINANCIAL SPECIFICATIONS

### cannabis_dispensary
Revenue label:     "Dispensing Revenue"
Revenue source:    dispensing_log × inventory_items.sell_price (NOT orders table)
COGS label:        "Product Acquisition Cost"
COGS source:       inventory_items.weighted_avg_cost × qty dispensed
Gross margin:      Green ≥50% | Amber 35–50% | Red <35%
Gross KPI label:   "Dispensing Margin"
OpEx must include: SAHPRA Licensing Fees, Pharmacist Salary, Cold Chain Equipment
IFRS revenue line: "Revenue — medical dispensing services"
VAT note:          Medical cannabis products may be zero-rated — flag for review

### food_beverage
Revenue label:     "Food & Beverage Sales"
Revenue source:    orders table (existing, works correctly)
COGS label:        "Food Cost"
COGS benchmark:    Food Cost % is the PRIMARY KPI (target <30% of revenue)
Gross margin:      Green ≥65% | Amber 55–65% | Red <55%
  (65% gross = 35% food cost, the industry danger threshold)
Gross KPI label:   "Gross Profit (Food Cost: X%)"
OpEx must include: Kitchen Wages, Produce Orders, Gas & Utilities, FSCA Fees
IFRS revenue line: "Revenue — food and beverage sales"

### cannabis_retail (current, keep mostly as-is)
Revenue label:     "Product Sales"
Revenue source:    orders table (correct)
COGS label:        "Cost of Goods Sold (AVCO)"
Gross margin:      Green ≥50% | Amber 30–50% | Red <30%
  (cannabis retail typically achieves 60%+ — current 35% threshold too conservative)
IFRS revenue line: "Revenue from contracts with customers"

### general_retail (current, keep as-is)
Revenue label:     "Product Sales"
Gross margin:      Green ≥35% | Amber 20–35% | Red <20%
  (lower margins normal for general retail — current thresholds are correct)

---

## CHANGES — FILE BY FILE

### A. HQProfitLoss.js — 6 changes

#### A1. Import industryProfile from useTenant()
Find:
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
Replace with:
  const { tenant, industryProfile } = useTenant();
  const tenantId = tenant?.id;

#### A2. Add dispensing revenue state + fetch
Add state (after existing state declarations):
  const [dispensingRevenue, setDispensingRevenue] = useState(0);
  const [dispensingCount, setDispensingCount] = useState(0);

Add fetch inside fetchAll (after existing fetches):
  // cannabis_dispensary: fetch revenue from dispensing_log × sell_price
  if (industryProfile === 'cannabis_dispensary') {
    try {
      const { data: dlData } = await supabase
        .from('dispensing_log')
        .select('quantity_dispensed, inventory_item_id, dispensed_at, is_voided')
        .eq('tenant_id', tenantId)
        .neq('is_voided', true);
      const itemPrices = {};
      (r11.data || []).forEach(i => { itemPrices[i.id] = parseFloat(i.sell_price || 0); });
      const rev = (dlData || [])
        .filter(dl => periodFilter(dl.dispensed_at, period, customFrom, customTo))
        .reduce((s, dl) => s + (dl.quantity_dispensed || 0) * (itemPrices[dl.inventory_item_id] || 0), 0);
      setDispensingRevenue(rev);
      setDispensingCount((dlData || []).filter(dl => periodFilter(dl.dispensed_at, period, customFrom, customTo)).length);
    } catch (_) {}
  }

#### A3. Profile-adaptive revenue variable
After existing revenue calculation, add:
  const profileRevenue = industryProfile === 'cannabis_dispensary'
    ? dispensingRevenue
    : totalRevenue;

Replace all downstream uses of totalRevenue in P&L calculations with profileRevenue.

#### A4. Profile-adaptive gross margin color thresholds
Replace:
  const pctColour = (pct) =>
    pct >= 35 ? "#2E7D32" : pct >= 20 ? "#E65100" : "#c62828";

With:
  const pctColour = (pct) => {
    if (industryProfile === 'food_beverage') {
      return pct >= 65 ? "#2E7D32" : pct >= 55 ? "#E65100" : "#c62828";
    }
    if (industryProfile === 'cannabis_retail') {
      return pct >= 50 ? "#2E7D32" : pct >= 30 ? "#E65100" : "#c62828";
    }
    if (industryProfile === 'cannabis_dispensary') {
      return pct >= 50 ? "#2E7D32" : pct >= 35 ? "#E65100" : "#c62828";
    }
    // general_retail default
    return pct >= 35 ? "#2E7D32" : pct >= 20 ? "#E65100" : "#c62828";
  };

#### A5. Profile-adaptive section labels
Define before the return:
  const PROFILE_LABELS = {
    cannabis_dispensary: {
      revenue:    'Dispensing Revenue',
      revenueDesc:'Dispensed products × sell price · Schedule 6 controlled substance records',
      cogs:       'Product Acquisition Cost',
      gross:      'Dispensing Margin',
    },
    food_beverage: {
      revenue:    'Food & Beverage Sales',
      revenueDesc:'Restaurant and café sales (ex-VAT)',
      cogs:       'Food Cost',
      gross:      'Gross Profit',
    },
    cannabis_retail: {
      revenue:    'Product Sales',
      revenueDesc:'Online and in-store product sales (ex-VAT)',
      cogs:       'Cost of Goods Sold (AVCO)',
      gross:      'Gross Profit',
    },
    general_retail: {
      revenue:    'Product Sales',
      revenueDesc:'Sales (ex-VAT)',
      cogs:       'Cost of Goods Sold (AVCO)',
      gross:      'Gross Profit',
    },
  };
  const PL = PROFILE_LABELS[industryProfile] || PROFILE_LABELS.general_retail;

Use PL.revenue, PL.cogs, PL.gross in all section headers and WRow labels.

#### A6. Profile-adaptive IFRS revenue line
In IFRSStatementView, the revenue line reads:
  "Revenue from contracts with customers"

Make it profile-aware by passing a prop `revenueIfrsLabel`:
  cannabis_dispensary: "Revenue — medical dispensing services"
  food_beverage:       "Revenue — food and beverage sales"
  cannabis_retail/general_retail: "Revenue from contracts with customers" (keep)

#### A7. Profile-adaptive SUBCATEGORY_TO_ACCOUNT additions
Add to the map for dispensary-specific accounts:
  "SAHPRA Licensing Fees":    { code: "60150", ifrsLabel: "Regulatory licensing fees" },
  "Pharmacist Salary":        { code: "60110", ifrsLabel: "Employee benefits — pharmacist" },
  "Cold Chain Equipment":     { code: "61500", ifrsLabel: "Medical equipment and maintenance" },
  "Professional Indemnity":   { code: "60410", ifrsLabel: "Professional indemnity insurance" },
  "Patient Education Materials": { code: "60510", ifrsLabel: "Clinical materials and supplies" },

Add for F&B-specific accounts:
  "Produce & Ingredients":    { code: "50100", ifrsLabel: "Raw material — food ingredients" },
  "Kitchen Wages":            { code: "60105", ifrsLabel: "Employee benefits — kitchen staff" },
  "Gas & Cooking Fuel":       { code: "60305", ifrsLabel: "Gas and cooking fuel" },
  "FSCA Compliance Fees":     { code: "60155", ifrsLabel: "Food safety compliance fees" },
  "Cleaning & Hygiene Supplies": { code: "61005", ifrsLabel: "Cleaning and hygiene materials" },

#### A8. Food Cost % KPI for food_beverage
For food_beverage profile, add a "Food Cost %" stat card above the gross profit section:
  Food Cost % = (totalCogs / profileRevenue) × 100
  Target: <30% (green), 30–35% (amber), >35% (red — danger zone)
  This is the primary profitability KPI for any F&B operation.

---

### B. ExpenseManager.js — 1 change

Add profile-adaptive suggested subcategories as quick-select chips when creating an expense.
The subcategory field is currently a free-text input.

Add before the subcategory input:
  const SUGGESTED_SUBCATS = {
    cannabis_dispensary: ['SAHPRA Licensing Fees','Pharmacist Salary','Cold Chain Equipment',
                          'Professional Indemnity','Patient Education Materials','Controlled Substance Security'],
    food_beverage:       ['Kitchen Wages','Produce & Ingredients','Gas & Cooking Fuel',
                          'FSCA Compliance Fees','Cleaning & Hygiene Supplies','Equipment Maintenance'],
    cannabis_retail:     ['Rent & Premises','Staff Wages','Packaging','Marketing','Security'],
    general_retail:      ['Rent & Premises','Staff Wages','Packaging','Marketing','Insurance'],
  };
  const suggestions = SUGGESTED_SUBCATS[industryProfile] || SUGGESTED_SUBCATS.general_retail;

Render as clickable chips above the subcategory input. Clicking a chip fills the subcategory field.

---

### C. HQCogs.js — 1 change (title/framing only)

The module title and primary tab heading should be profile-adaptive:
  cannabis_dispensary: "Product Acquisition Cost"
  food_beverage:       "Food Cost & Recipe Profitability" (mostly done already)
  all others:          "COGS Builder" (keep current)

READ THE FILE IN FULL before touching it — it is 145KB with food_beverage-specific tabs already built.

---

### D. TenantPortal.js — add FOOD_BEVERAGE_WATERFALL

After CANNABIS_DISPENSARY_WATERFALL, add:

const FOOD_BEVERAGE_WATERFALL = [
  {
    id: "home", label: "Home", icon: Home, color: "#1A3D2B", alwaysOpen: true,
    tabs: [{ id: "overview", label: "Dashboard", desc: "Daily covers · food cost % · kitchen alerts" }],
  },
  {
    id: "kitchen", label: "Kitchen", icon: Layers, color: "#92400E",
    tabs: [
      { id: "hq-production",   label: "Recipe Runs",       desc: "Production runs · yield · QC · allergen log" },
      { id: "hq-recipes",      label: "Recipes",            desc: "Recipe engine · cost per portion · BOM" },
      { id: "hq-ingredients",  label: "Ingredients",        desc: "SA DAFF ingredients · allergen matrix" },
    ],
  },
  {
    id: "food-safety", label: "Food Safety", icon: Activity, color: "#1E3A5F",
    tabs: [
      { id: "hq-haccp",        label: "HACCP",              desc: "Control points · CCPs · corrective actions" },
      { id: "hq-food-safety",  label: "Food Safety",        desc: "R638 compliance · certificates · checklists" },
      { id: "hq-cold-chain",   label: "Cold Chain",         desc: "Temperature logs · breach alerts" },
      { id: "hq-recall",       label: "Recall & Trace",     desc: "Lot traceability · FSCA recall events" },
      { id: "hq-nutrition",    label: "Nutrition Labels",   desc: "Per-portion macros · allergen declaration" },
    ],
  },
  {
    id: "inventory", label: "Inventory", icon: Package, color: "#1A3D2B",
    tabs: [
      { id: "stock",           label: "Stock Control",      desc: "Raw materials · FEFO · movements · AVCO" },
      { id: "supply-chain",    label: "Suppliers & POs",    desc: "Produce orders · delivery receipt · GRN" },
    ],
  },
  {
    id: "sales", label: "Sales & Service", icon: ShoppingBag, color: "#065F46",
    tabs: [
      { id: "trading",         label: "Daily Trading",      desc: "Covers · avg spend · revenue vs food cost" },
      { id: "cashup",          label: "Cash-Up",            desc: "EOD · till reconciliation · variance" },
      { id: "pos",             label: "POS Till",           desc: "Table service · takeaway · delivery orders" },
      { id: "loyalty",         label: "Loyalty",            desc: "Repeat customer rewards" },
    ],
  },
  {
    id: "financials", label: "Financials", icon: TrendingUp, color: "#991B1B",
    tabs: [
      { id: "pl",              label: "Profit & Loss",      desc: "Food cost % · gross margin · net profit" },
      { id: "expenses",        label: "Expenses",           desc: "OPEX · produce costs · wages" },
      { id: "invoices",        label: "Invoices",           desc: "Supplier invoices · customer receipts" },
      { id: "journals",        label: "Journals",           desc: "Accruals · prepayments · corrections" },
      { id: "vat",             label: "VAT",                desc: "VAT201 · output · input · SARS filing" },
      { id: "bank-recon",      label: "Bank Recon",         desc: "Statement import · match · reconcile" },
      { id: "balance-sheet",   label: "Balance Sheet",      desc: "Assets · liabilities · equity" },
      { id: "forecast",        label: "Forecast",           desc: "Revenue projection · food cost trend" },
      { id: "year-end",        label: "Year-End Close",     desc: "Lock year · retained earnings · archive" },
    ],
  },
  {
    id: "people", label: "People", icon: Briefcase, color: "#374151",
    tabs: [
      { id: "staff",           label: "Staff",              desc: "Kitchen · FOH · delivery · HPCSA records" },
      { id: "roster",          label: "Roster",             desc: "Who is working this week · shift schedule" },
      { id: "timesheets",      label: "Timesheets",         desc: "Track hours · approve · lock" },
      { id: "leave",           label: "Leave",              desc: "Leave requests · balances · approval" },
      { id: "payroll",         label: "Payroll",            desc: "Pay runs · payslips" },
    ],
  },
];

const FB_ROLE_SECTIONS = {
  staff:   ["home", "kitchen", "sales"],
  manager: ["home", "kitchen", "food-safety", "inventory", "sales", "people"],
  owner:   ["home", "kitchen", "food-safety", "inventory", "sales", "financials", "people"],
  admin:   ["home", "kitchen", "food-safety", "inventory", "sales", "financials", "people"],
};

Update getWaterfall():
  if (industryProfile === 'food_beverage') return FOOD_BEVERAGE_WATERFALL;

Update visibleSections ternary to add:
  activeWaterfall === FOOD_BEVERAGE_WATERFALL
    ? activeWaterfall.filter(s => (FB_ROLE_SECTIONS[userRole] || FB_ROLE_SECTIONS.owner).includes(s.id))
    :

---

### E. useNavConfig.js — 3 label renames

These are 3 str_replace edits in HQ_PAGES:

1. Finance group label: "Finance" → "Financials"
   (every entry with group: "Finance" stays the same — only the display label in NavSidebar changes)
   Actually: the group string IS the display label. Change all group: "Finance" → group: "Financials"

2. Intelligence group label: "Intelligence" → "Analytics"
   Change all group: "Intelligence" → group: "Analytics"

3. Procurement tab label: label: "Procurement" → label: "Purchasing"
   (the tab id 'procurement' stays the same — only the display label changes)

---

## NEW LL RULES

LL-231: cannabis_dispensary P&L revenue source is dispensing_log, NOT orders.
  The orders table has zero records for dispensary tenants.
  Revenue = SUM(quantity_dispensed × inventory_items.sell_price) for the period.
  NEVER query orders table for dispensary revenue.

LL-232: Food & Beverage primary financial KPI is Food Cost % (target <30%).
  Gross margin threshold: Green ≥65%, Amber 55–65%, Red <55%.
  These differ from retail thresholds. Never apply retail margin benchmarks to F&B.

LL-233: Before touching HQCogs.js, read it in full — it is 145KB with existing
  food_beverage tabs. Do not overwrite or duplicate any food_beverage section.

LL-234: SUBCATEGORY_TO_ACCOUNT in HQProfitLoss.js is the IFRS account mapping.
  Adding profile-specific entries here is additive — never remove existing entries.
  The map is used regardless of profile for any expense that has a matching subcategory key.

---

*WP-FINANCIAL-PROFILES v1.0 · NuAi · 11 April 2026*
