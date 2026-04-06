# WP-STOCK-MERGE — Unified Inventory Navigation
## Version: 1.0 · April 2, 2026
## Status: PLACEHOLDER — future WP, not in current build queue
## Triggered by: Navigation fragmentation identified April 2, 2026

---

## THE PROBLEM (owner-identified)

Current navigation structure is fragmented:

  INVENTORY
    ├── Stock
    │     ├── Overview
    │     ├── Items (183)          → old simple list
    │     ├── Movements
    │     ├── Pricing
    │     ├── Receipts
    │     ├── Purchase Orders
    │     └── Shop Manager
    │
    └── Smart Catalog              → SHOULD BE INSIDE STOCK
          (built as standalone, not integrated)

  Missing entirely: Reorder Queue

The result: Smart Catalog is building excellent features (SC-01 through SC-10)
but sits outside the Stock hub where it logically belongs.

---

## THE LONG-TERM TARGET STRUCTURE

  INVENTORY
    └── Stock (unified hub)
          ├── Overview             → existing, keep
          ├── Smart Catalog        → replaces old "Items" tab entirely
          │     (all SC-01–SC-10 features live here)
          ├── Reorder Queue        → WP-REORDER, triggered from Smart Catalog
          ├── Movements            → existing, keep
          ├── Pricing              → existing, keep
          ├── Receipts             → existing, keep
          ├── Purchase Orders      → existing, keep
          └── Shop Manager         → existing, keep

Navigation sidebar:
  - "Stock" expands to show sub-tabs
  - "Smart Catalog" nav item is removed (it's now inside Stock)
  - One unified inventory experience

---

## WHY NOT NOW

  Smart Catalog is currently being built as the blueprint for all data tables.
  SC-01 through SC-10 are mid-build.
  The merge requires:
    - Removing Smart Catalog from the top-level nav
    - Wiring it as a tab inside HQStock / TenantPortal stock tab
    - Ensuring all SC-01–SC-10 features survive the move
    - Updating routing, breadcrumbs, URL params
    - Regression-testing everything in HQStock
  This is a 1-2 session architectural task.
  Risk of breaking things is high mid-build.

  The right time: AFTER SC-01 through SC-10 are complete and tested.
  Smart Catalog as a finished product → then merge it into Stock cleanly.

---

## PLACEMARKER DECISIONS (to be confirmed in scoping)

  Q1: Does "Smart Catalog" stay as a nav item until merge, or is it hidden?
      Current answer: stays visible, as-is, until WP-STOCK-MERGE

  Q2: Old "Items" tab in Stock — does it get retired when Smart Catalog moves in?
      Current assumption: yes — Smart Catalog IS the new Items tab, more powerful

  Q3: Does the Stock URL structure change?
      (e.g. /tenant-portal?tab=stock&view=catalog vs /tenant-portal?tab=catalog)
      To be decided in WP-STOCK-MERGE scoping

  Q4: HQStock and TenantPortal both have Stock — do they both get Smart Catalog?
      Current: Smart Catalog is in TenantPortal only
      TenantPortal Stock tab = HQStock component rendered for that tenant
      WP-STOCK-MERGE needs to unify these

---

## PRE-REQUISITES BEFORE THIS WP CAN START

  1. WP-SMART-CATALOG: SC-01 through SC-10 ALL complete
  2. WP-REORDER: Phase 1 complete (reorder slide-out working)
  3. Owner session: full navigation architecture review
     (what stays, what goes, new URL structure, mobile layout)

---

## ESTIMATED COMPLEXITY

  Architecture review:    1 session (owner + dev, no code)
  Implementation:         2-3 sessions (routing, tab wiring, regression)
  Testing + polish:       1 session

  Total: 4-5 sessions after pre-requisites met

---

*WP-STOCK-MERGE v1.0 · NuAi · April 2, 2026*
*Placeholder only — do not build until Smart Catalog SC-01–SC-10 are complete*
