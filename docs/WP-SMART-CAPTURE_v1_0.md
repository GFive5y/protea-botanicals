# WP-SMART-CAPTURE v1.0
## AI-Powered Receipt & Invoice Capture — Anti-Fraud Edition
## NuAi · Apr 2026 · Session 1 Complete

---

## What This Is

Photo any business document — petrol slip, supplier invoice, restaurant bill, utility account —
the system reads it, validates against SARS, checks for fraud, posts to accounting, and reports
what was done. Under 90 seconds. No data entry.

---

## Architecture

### process-document v2.1 (Edge Function)
1. Claude Vision reads document
2. allocateLumpSumCosts() — resolves unpriced lines
3. classifyExpenseDocument() — CAPEX vs OPEX
4. checkSarsCompliance() — SARS section 20 VAT Act (5 fields)
5. classifyCaptureType() — petrol_slip | supplier_invoice | utility_bill | entertainment | expense_receipt
6. extractUniqueIdentifiers() — SA bank IDs (UTI/TRN REF/TXN ID/Auth Code/ECHO/Merchant/PAN)
7. buildDocumentFingerprint() — 6-level hierarchy with confidence
8. checkDuplicateDocument() — image hash + fingerprint match
9. Write to document_log with all metadata
10. Return full result

### auto-post-capture v1 (Edge Function)
Creates atomically: expense + journal_entries + journal_lines + vat_transactions
Balance check: |Dr - Cr| < R0.05
Idempotent: returns early if already posted

### HQSmartCapture.js (React Component)
Mobile-first camera UI → processFile() → process-document → policy engine → capture_queue
Auto-post if confidence >= 88%, no approval flags, vendor+amount present

---

## Anti-Fraud: 6-Level Document Fingerprint

| Level | Identifier | Confidence | Available On |
|---|---|---|---|
| 1 | UTI / TRN REF / TXN ID | 100% | Card transactions, most SA banks |
| 2 | Auth Code + Date | 99.9% | ALL approved card transactions |
| 3 | ECHO + Merchant No | 97% | Most SA bank terminals |
| 4 | Receipt No + Merchant + Date | 95% | Card and some cash |
| 5 | Receipt No + Date | 90% | When merchant not parseable |
| 6 | Vendor + Date + Amount + Time | 80% | Cash slips, fleet cards |

SA Bank Label Map:
- UTI: "UTI:" (Absa) | "TRN REF:" (FNB) | "TXN ID:" (StdBank) | "TRANSACTION REF:" (Nedbank)
- Auth Code: "Auth Code:" | "AUTH:" | "Authorisation Code:" | "Approval Code:" (all SA banks)
- Receipt: ONLY "Receipt:" label — NOT "Batch-Rec:", NOT "Slip No:" (not unique)

3 Detection Layers:
1. Image hash — same photo uploaded twice (100%)
2. Document fingerprint — same document, different photo (80-100%)
3. Semantic — same vendor+date+amount within 30 days (soft flag)

Duplicate detected → confidence hard-capped at 10% → DuplicateBanner → approve blocked

---

## Capture Rules (10 active)

| Rule | Type | Action | Priority |
|---|---|---|---|
| Block exact duplicate | duplicate_check | block | 1 |
| Flag probable duplicate | probable_duplicate | require_approval | 2 |
| Flag rapid recapture | rapid_recapture | require_approval | 3 |
| Auto-categorise fuel | category_auto | auto_categorise | 5 |
| Auto-categorise municipalities | category_auto | auto_categorise | 5 |
| Auto-categorise telecoms | category_auto | auto_categorise | 5 |
| Auto-categorise security | category_auto | auto_categorise | 5 |
| Approval above R1,000 | amount_threshold | require_approval | 10 |
| Entertainment approval | approval_required | require_approval | 20 |
| Flag missing VAT number | vat_required | flag | 30 |

---

## SARS Compliance (Section 20 VAT Act)

Checks 5 fields: VAT registration number (10 digits, starts with 4), invoice date,
invoice number, line item descriptions, VAT amount separately stated.
Non-compliant → input VAT not claimable. Petrol pump slips are NOT tax invoices.

---

## CoA Account Mapping

| Subcategory | Debit | Credit |
|---|---|---|
| Rent & Premises | 60000 | 20000 (AP) |
| Staff Wages | 60100 | 10100 (Cash) |
| Utilities | 60300 | 20000 (AP) |
| Vehicle & Travel | 61900 | 10100 (Cash) |
| VAT Receivable | 11100 | — (Dr when claimable) |

---

## Schema Additions

capture_queue: 45+ columns including document_fingerprint, image_hash, unique_identifiers,
is_duplicate, duplicate_of_id, duplicate_confidence, duplicate_details, fraud_flags
capture_rules: 10 rows, parameters JSONB, priority ordering
document_log additions: document_fingerprint, image_hash, unique_identifiers, is_duplicate
expenses additions: capture_queue_id, journal_entry_id, vat_transaction_id, sars fields

---

## Phase 2 (TODO)
- Supplier invoice → PO match → stock received
- Multi-document bulk capture
- Month-end capture report for accountant
- Approval queue UI
- Phone PWA (offline queue)

---

*WP-SMART-CAPTURE v1.0 · NuAi · 08 Apr 2026*
*The accounting system that captures itself.*
