# SESSION-STATE v205 — 08 Apr 2026 (Extended)

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **Live URL:** protea-botanicals-git-main-gfive5ys-projects.vercel.app

---

## Session Apr 8 2026 Extended — Stock Receipt Flow

### Commits This Session (continuation of v204)

| SHA | Description |
|---|---|
| `4523c5d` | fix(year-end): loadPnl uses journal_entries.financial_year TEXT |
| `decf5b7` | feat(smart-capture): stock receipt flow — receive-from-capture EF |

### MCP Actions
- `receive-from-capture` EF deployed (Supabase MCP) — v1, verify_jwt=false

---

## What Was Built — Stock Receipt Flow

**New EF: receive-from-capture v1**
Input: `{ capture_queue_id, approved_by }`
Handles 3 proposed_update types:
1. `receive_delivery_item` — item_id already resolved by process-document → direct stock movement
2. `create_purchase_order` — creates PO (po_status=received), resolves item_id via name match, creates stock movements
3. `create_inventory_item + create_stock_movement` — creates new SKU then receives it

For each item received:
- INSERT stock_movements (purchase_in, quantity, unit_cost, reference=invoice ref)
- UPDATE inventory_items.quantity_on_hand += qty
- AVCO recalculated: (old_qty × old_avco + recv_qty × unit_cost) / (old_qty + recv_qty)

Journal: Dr 12000 Inventories / Cr 20000 Trade Payables (full invoice amount)
UPDATE capture_queue status=approved, journal_entry_id

**HQSmartCapture.js enhancement (4 str_replace ops):**
- `isStockCapture` — detects delivery_note/supplier_invoice with proposed_updates
- `handleReceiveStock()` — calls receive-from-capture EF
- "📦 Stock to Receive" panel — shows line items with matched/unmatched badges
- Conditional button: navy "Receive Stock + Post" vs green "Approve & Post"
- Conditional success screen: items_received/skipped/PO/journal vs expense IDs

---

## Confirmed Live Results (phone tests)

| Test | Result |
|---|---|
| Petrol slip → capture_queue insert | ✅ Fixed (PostgREST reload + fnData) |
| Fingerprint stored | ✅ composite:sasolpersequor:2024-11-19:1000 |
| Success screen shows IDs | ✅ expense acbdc874 + journal 10f6423b |
| Duplicate → DuplicateBanner | ✅ is_duplicate=true, confidence=0.800 |
| Year-End Close loads | ✅ FY2026 P&L from journal_entries.financial_year |

---

## DB State (session close)
capture_queue:       4 rows (3 live UI + 1 manual)

is_duplicate=true row: 79fd34fd (composite 80%)
document_log:        14+ rows (fingerprints now stored after PostgREST reload)
stock_movements:     existing (purchase_in flow now automated via receive-from-capture)
financial_year_archive: 0 rows (year not closed yet in test)


## EF Status

| EF | Version | Status |
|---|---|---|
| process-document | v2.1 | ✅ DEPLOYED |
| auto-post-capture | v1 | ✅ DEPLOYED |
| receive-from-capture | v1 | ✅ DEPLOYED (Apr 8) |

---

## Outstanding — Next Session

1. **Live test receive-from-capture** — photograph a supplier invoice with stock items, verify stock_movements created + inventory quantities updated + journal Dr 12000 Cr 20000
2. **Unmatched item handling** — when proposed_updates has items with no item_id, show UI to manually assign before receiving
3. **WP-LOYALTY-ENGINE v2** — nightly AI loyalty automation EF (churn rescue, birthday, expiry)
4. **Yoco keys** — WP-PAY S1 (owner action required)
5. **Year-End Close live test** — navigate Reports → Year-End Close → run through FY2026 close

## Schema Used (key)

- `stock_movements`: purchase_in movement_type, item_id, quantity, unit_cost, reference, tenant_id
- `journal_entries`: financial_year TEXT (not UUID FK), journal_date, journal_type
- `journal_lines`: journal_id, account_code, debit_amount, credit_amount, tenant_id, line_order
- `purchase_orders`: po_status (draft|submitted|confirmed|shipped|received|cancelled|complete)
- `purchase_order_items`: po_id, item_id, quantity_ordered, quantity_received, unit_cost

---

*SESSION-STATE v205 · NuAi · 08 Apr 2026*
