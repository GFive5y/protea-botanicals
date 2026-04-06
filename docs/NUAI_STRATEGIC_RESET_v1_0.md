# NuAi — STRATEGIC RESET & HOLISTIC REVIEW
## March 30, 2026 · Confidential
## Purpose: Honest assessment of where we are, what's broken, and the path forward

---

## PART 1 — THE HONEST DIAGNOSIS

### What you felt today is real

"It looks complicated and disjointed. We're just slapping work on with no structure."

You are correct. Here's why it happened and what it means:

**The build pattern until today:**
Every session added a new Work Package (WP) on top of the last.
WP-FNB → WP-AI → WP-FIN → WP-O → WP-MEDI-STOCK
Each WP was technically correct in isolation.
But nobody stepped back to ask: *does a first-time user understand this system?*

**The result:**
- 20+ modules built — but no onboarding flow connecting them
- Stock exists in 3 different places (HQStock, StockControl, HRStockView) — same data, different UIs
- The shop clerk UI (Admin portal) shows 182 items in a flat list with no guidance
- The owner UI (HQ/TenantPortal) is powerful but overwhelming
- The customer UI (Shop) is empty because no QR codes exist yet
- Everything works. Nothing feels designed for a human.

**This is normal at this stage of a platform build.** The engineering phase is done.
What starts now is the *product design phase* — making it feel like software, not code.

---

## PART 2 — WHAT LEADING STOCK SYSTEMS DO (and what we should steal)

### Shopify (best-in-class for SME retail)
```
What works:
  ✓ Product pages with variants (Size / Colour / Weight) in one record
  ✓ Collections (= our "brand groups") — assign products to a collection, filter by it
  ✓ Bulk editor — spreadsheet-style, edit 50 products at once
  ✓ Import/Export via CSV — entire catalogue in one file
  ✓ Inventory history per item — every movement shown
  ✓ Low stock alerts as a dashboard tile, not a buried list
  ✓ "Draft" vs "Active" product state — build a catalogue before going live
What's missing that we have:
  ✗ No AVCO / real landed cost
  ✗ No multi-tenant (it IS multi-tenant per store but no operator layer)
  ✗ No loyalty engine (needs third-party app)
  ✗ No production module
  ✗ No AI document ingestion
```

### Vend / Lightspeed (retail POS-native)
```
What works:
  ✓ Product catalogue with photo, barcode, supplier, cost, sell price all visible
  ✓ Quick keys — top 8 products pinned to POS screen for fast sale
  ✓ Variant matrix — one product, select weight/size at point of sale
  ✓ Reorder level shown as a progress bar not just a number
  ✓ Supplier catalogue — order from supplier directly in the system
What's missing that we have:
  ✗ No AI
  ✗ No multi-tenant operator view
  ✗ No loyalty engine worth using
  ✗ R1,800–R4,500/month for SA (we're R3,500 with 10× more features)
```

### Yoco Stock (what the cashier mentioned)
```
What works:
  ✓ Simple. Very simple. Anyone can learn it in 5 minutes.
  ✓ Hierarchy for variants — "Open" parent product → add sizes
  ✓ Works at POS — click product → rings up sale → stock deducts
What's broken:
  ✗ Hierarchy is the problem — too complex for most users (the cashier said this)
  ✗ Zero COGS. No cost visibility. No margin.
  ✗ No AI
  ✗ No loyalty
  ✗ No production
  ✗ No HR
```

### What we should steal:
```
FROM SHOPIFY:  Collections / brand groups + Bulk CSV editor + Draft/Active state
FROM VEND:     Quick keys for POS + Variant matrix at point of sale + Reorder progress bar
FROM YOCO:     Simplicity in the clerk-facing view
FROM NONE:     The AI layer. The AVCO engine. The multi-tenant operator view.
               Nobody has built this for SA specialty retail. That's the moat.
```

---

## PART 3 — THE THREE USER TYPES (currently conflated — this is the root cause)

Right now all three types of user share the same complexity. They shouldn't.

### User 1 — The Operator (you)
```
Who:    Gerhardt / the NuAi operator managing all tenants
Needs:  Full system visibility. P&L across all clients. Health alerts.
        Add/remove tenants. Configure loyalty. Manage features.
Portal: /hq — HQ Command Centre
State:  ✅ BUILT — very feature-rich
Gap:    UX is dense. Needs a cleaner HQ Overview dashboard.
```

### User 2 — The Shop Manager / Owner
```
Who:    The Medi Recreational owner / Pure PTV manager
Needs:  Their own P&L. Their stock. Their customers. Their staff.
        Add products. Set prices. Run promotions. See margins.
Portal: /tenant-portal — Client Portal
State:  ✅ BUILT but stock UI is a flat list — needs visual catalogue
Gap:    No product catalogue view. No brand/category grouping. No quick edit.
        This is what we fix in WP-MEDI-STOCK Session 2.
```

### User 3 — The Shop Clerk / Cashier
```
Who:    Staff member at the till at Medi Recreational
Needs:  Check stock. Process a sale. Scan a QR. NOTHING ELSE.
        Simple. Fast. No training required.
Portal: /admin — Shop Dashboard
State:  ✅ BUILT but shows 182 items in a flat alphabetical list
Gap:    No quick-sale screen. No product photos. No variant selector at POS.
        No "top sellers" shortcut. Feels like a database not a till.
        This is WP-POS — not yet built.
```

---

## PART 4 — THE STOCK UI SPECIFICALLY

### Current state (honest):
```
HQStock.js (v3.1):
  - Flat list, alphabetical
  - Category dropdown filter
  - Search by name/SKU
  - Click row → edit modal
  - ✅ Works for the operator
  - ✗ Not usable by a shop manager who doesn't know SQL

StockControl.js (Admin portal):
  - Same flat list
  - Expandable rows with AI analysis
  - ✅ Works for a tech-savvy manager
  - ✗ Not usable by a cashier

No screen that shows:
  - "Show me all my RAW products" with one click
  - "Show me everything below reorder" as an actionable dashboard
  - "Add a new size variant to Canna Coco" without knowing the SKU format
  - "Delete the entire Gizeh range" with two clicks
  - The catalogue as a visual grid (not a table)
```

### What the stock UI needs to become:
```
Level 1 — Catalogue View (shop manager):
  Visual grid of brand/category tiles
  Click "RAW" → see all 32 RAW products as cards with photo placeholder,
  name, SKU, stock level, sell price, margin badge
  Quick buttons: Edit · Adjust Stock · Deactivate

Level 2 — Bulk Management (operator):
  Spreadsheet view — edit name, price, cost, reorder qty inline
  CSV import/export (already partially there via ExpenseManager pattern)
  Filter by brand, category, supplier, active/inactive state

Level 3 — Alerts Dashboard (always visible):
  Not buried in PlatformBar — a dedicated stock health panel
  "12 items below reorder → raise PO"
  "3 items out of stock and live in shop → remove or restock"
  "AVCO has not been updated in 30 days on 8 items"
```

---

## PART 5 — WHAT'S ACTUALLY MISSING (the gaps that matter)

### Gap 1 — No Stock Entry Flow for a real clerk
```
Current: Clerk opens /admin → Inventory → sees 182 items → ??
Missing: A "Receive Stock" button that:
  1. Asks: what supplier? what date?
  2. Shows a list of items from that supplier
  3. Clerk enters quantities received
  4. System creates stock_movements (purchase_in), updates quantity_on_hand, calculates new AVCO
  5. Done. No SQL. No modal hunting.
This is WP-STOCK-RECEIVE — not yet planned.
```

### Gap 2 — No Point of Sale screen
```
Current: Sales go through the online Shop → CheckoutPage → PayFast
Missing: An in-store POS screen for the cashier:
  Product grid → tap item → tap weight/variant → add to cart → total → charge on Yoco
This is WP-POS — requires Yoco SDK approval (Android/iOS native or web manual entry)
```

### Gap 3 — No Customer-Facing Medi Recreational Store
```
Current: Shop.js loads products based on StorefrontContext domain resolution
Missing: Medi Recreational has 182 products in DB but zero QR codes assigned
  No sell_price set (all R0.00)
  Domain not confirmed
  No customer has visited or scanned
Next step: Set sell prices → generate QR codes → domain → go live
```

### Gap 4 — Loyalty is configured but untested end-to-end
```
Current: loyalty_config row exists for Medi (b1bad266)
         HQLoyalty.js v4.0 shows the config UI
Missing: End-to-end test:
  Customer scans QR → points awarded at correct category rate →
  tier upgrades → redemption at checkout
  None of this has been tested for Medi Recreational specifically.
```

### Gap 5 — No pricing set on 182 Medi SKUs
```
Current: sell_price = 0 on all 182 items
         product_pricing table has no rows for b1bad266
Missing: Sell prices on all items — needed for:
  - Shop to display products
  - P&L to show revenue
  - Loyalty to calculate pts_per_r100
  - Demo to show real margin numbers
```

### Gap 6 — ProteaAI CODEBASE_FACTS is stale
```
Current: Says "Vercel deploy pending", "WP-FIN BLOCKED"
Missing: Update to reflect current state:
  WP-O complete, WP-FIN S5+S6 complete, 182 Medi SKUs loaded, etc.
```

---

## PART 6 — SHORT TERM GOALS (next 2 weeks)

These are the only things that matter before the Medi demo:

```
WEEK 1 — Make the demo possible:
  ⚡ 1. Set sell prices on top 40 Medi SKUs (SQL + UI)
  ⚡ 2. Generate QR codes for top 40 SKUs
  ⚡ 3. Run end-to-end loyalty test (scan → points → tier)
  ⚡ 4. WP-MEDI-STOCK S2: brand filter UI in HQStock/TenantPortal
  ⚡ 5. Fix 182 "below reorder" alert (set reorder_qty = 0 for untracked items)
  ⚡ 6. Register nuai.co.za + deploy updated website

WEEK 2 — Make the demo impressive:
  ⚡ 7. Set up demo script (Part 9 of WP-MEDI-STOCK spec)
  ⚡ 8. Practice walkthrough — 20 minutes max
  ⚡ 9. Have Medi owner in for a demo session
  ⚡ 10. Invoice sent
```

---

## PART 7 — LONG TERM GOALS (3–12 months)

```
MONTH 1-2 — First paying client:
  → Medi Recreational signed (R6,500/mo Operator plan)
  → CIPC registered + bank account + Yoco live keys
  → PayFast switched to live

MONTH 2-3 — Platform hardening:
  → WP-POS: in-store POS screen (web manual entry first, Yoco native later)
  → WP-STOCK-RECEIVE: stock receipt flow for clerks
  → WP-PAY S1-S2: Yoco online gateway + reconciliation
  → BUG-047/045/046: cosmetic fixes
  → ProteaAI CODEBASE_FACTS updated

MONTH 3-4 — Second client:
  → Pure PTV goes fully live (domain + Yoco + stock loaded)
  → Client 3 prospect identified
  → Pricing page live on nuai.co.za

MONTH 4-6 — Scale to 5 clients:
  → Self-service onboarding wizard (TenantSetupWizard live)
  → Stripe subscription billing
  → MRR dashboard in HQ

MONTH 6-12 — 10 clients / R70k MRR:
  → Native mobile app (React Native — iOS + Android)
  → Loyalty AI edge function (nightly cron, 7 jobs)
  → Accounting integrations (Xero/Sage CSV at minimum)
  → Enterprise tier client (manufacturer/distributor)
```

---

## PART 8 — WHAT TO BUILD NEXT (priority order)

```
P0  DEMO PREP (no code — owner actions):
    Set sell prices on 40 Medi SKUs
    Register nuai.co.za
    Confirm Medi domain

P1  WP-MEDI-STOCK S2 (2-3 hours):
    Brand filter pills on HQStock + TenantPortal stock
    Variant badge on each item row
    Group-by-brand toggle
    Fix: set reorder_qty = 0 for items where we don't track reorder yet
    → Makes the demo look professional

P2  WP-STOCK-RECEIVE (2-3 hours):
    "Receive Stock" button in Admin portal
    Guided flow: supplier → items → quantities → confirm
    Writes stock_movements, updates quantity_on_hand, recalculates AVCO
    → Makes stock management accessible to a real clerk

P3  WP-PAY S1 (3-4 hours, needs Yoco keys):
    Yoco online gateway replacing PayFast
    → Unblocks real payment processing for Medi

P4  QR GENERATION FOR MEDI (1 hour):
    Generate QR codes for all 182 SKUs
    Print-ready QR sheet
    → Enables loyalty scanning from day 1

P5  WP-POS (4-5 hours, future):
    In-store quick-sale screen for cashiers
    Product grid → variant selector → total → Yoco tap
    → Replaces the need for Yoco stock entirely
```

---

## PART 9 — FILES TO UPDATE

### Replace in project knowledge:
```
STRATEGY_v1_5.md          → Replace with STRATEGY_v2_0.md (this document informs it)
SESSION-STATE_v153.md      → Replace with SESSION-STATE_v154.md (after this session)
WP-MEDI-STOCK_v1_0.md     → ADD to project knowledge (new file)
```

### Update in codebase (next build session):
```
src/components/ProteaAI.js   const CODEBASE_FACTS → update stale content
src/components/hq/HQStock.js → WP-MEDI-STOCK S2 (brand filter UI)
```

### Do NOT touch:
```
src/components/PlatformBar.js   LOCKED
src/components/hq/LiveFXBar.js  LOCKED
src/services/supabaseClient.js  LOCKED
src/components/ProteaAI.js      LOCKED (except CODEBASE_FACTS string)
```

---

## PART 10 — THE THREE QUESTIONS TO ASK BEFORE EVERY BUILD SESSION

1. **Who is this for?** Operator / Shop Manager / Clerk / Customer — pick one.
2. **What is the one thing they need to do?** Be specific. Not "manage stock" — "receive a delivery from a supplier".
3. **Does this already exist?** Check MANIFEST + disk before writing a line.

If you can't answer all three — don't start building.

---

## APPENDIX — CURRENT INVENTORY SYSTEM TRUTH

```
Three stock UIs exist. Know which one you're in:

1. HQStock.js (/hq?tab=hq-stock)
   → Operator view. All tenants. Full edit access. AVCO visible.
   → Current gap: flat list, no brand grouping

2. StockControl.js (/admin?tab=stock)
   → Shop manager/clerk view. Their tenant only. Read-only by design.
   → Current gap: flat list, no brand grouping, no receive flow

3. HRStockView.js (/hr?tab=stock)
   → HR manager view. Global scope. Stock take only. No prices shown.
   → Current gap: not linked to Medi yet

These three views serve different users and should NEVER be merged.
They share the same data (inventory_items) but show it differently.
This is correct architecture. The gap is the UX within each view.
```

---

*Strategic Reset v1.0 · NuAi · March 30, 2026*
*This document replaces the disorganised session-by-session improvisation.*
*Every build session should reference Part 8 (priority order) and Part 10 (3 questions).*
