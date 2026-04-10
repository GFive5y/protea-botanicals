# COMMERCIAL-READINESS v1.0
## Nu Ai (Pty) Ltd. — Stack Deep Dive & Gap Analysis
## Produced: 10 Apr 2026 from live Supabase data
## This document is the commercial build roadmap

---

## WHAT WAS ASSESSED

Full analysis of whether the current stack (React 18 + Supabase + Edge
Functions + Vercel) can handle the commercial vision: multiple companies,
photo/receipt capture, document archiving, multi-company bookkeeping,
and multi-website inventory management.

---

## SURPRISING FINDING — MORE IS BUILT THAN EXPECTED

File storage is already implemented and working:

| Asset | Status | Evidence |
|---|---|---|
| Supabase Storage bucket (supplier-documents) | Live | 48 files, 26MB stored |
| Supabase Storage bucket (coa-documents) | Live | 2 files |
| capture_queue.image_storage_path | Live | Column populated on captures |
| document_log.file_url | Live | URL column exists |
| HMAC fraud fingerprinting | Working | document_fingerprint column, tested |
| Duplicate detection | Working | 1 duplicate caught in test data |
| SARS compliance checking | Working | sars_compliant, sars_flags per capture |
| Fraud detection | Working | fraud_flags column |

The "never lose a receipt" database architecture is implemented.
The gap is the front-end UX — specifically mobile camera access.

---

## CURRENT SCALE vs. COMMERCIAL SCALE

| Metric | Today (1 tenant, 5 months) | 100 tenants projected |
|---|---|---|
| Database size | 25MB | ~2.5GB |
| File storage | 27MB | ~2.7GB |
| Orders | 468 | 46,800 |
| Stock movements | 2,293 | 229,300 |
| Stored documents | 50 | ~5,000 |

Supabase FREE tier: 500MB DB, 1GB storage.
Supabase Pro ($25/month): 8GB DB, 100GB storage.
100 tenants fits comfortably on Pro.

---

## WHAT THE STACK CAN HANDLE

| Capability | Status |
|---|---|
| Multi-tenant isolation (RLS, tenant_id) | Built — all 109 tables |
| File/image storage | Built — Supabase Storage S3-compatible |
| Document archiving with original images | Built — capture_queue + storage |
| Receipt and invoice permanent storage | Built — supplier-documents bucket |
| HMAC anti-fraud fingerprinting | Working |
| Duplicate invoice detection | Working |
| SARS VAT compliance checking per document | Working |
| Multi-company bookkeeping (IFRS) | Built — fully tenant-isolated |
| Multi-website inventory management | Partial — per-tenant, channel pricing exists |
| IFRS financial statements per company | Built |
| Global CDN for the web app | Vercel |
| Edge Functions (10 deployed) | Globally distributed |
| PostgreSQL at scale | Handles millions of records with indexing |

---

## 8 COMMERCIAL GAPS

### GAP-C01: Mobile Camera Capture (Priority 1 — 2-3 days)
Smart Capture requires file upload. No native camera access.
The "scan a slip in the restaurant" UX requires:
<input type="file" accept="image/*" capture="environment">
This triggers the native camera on mobile browsers without a native app.
Also add PWA manifest for home screen installation.
File: src/components/hq/HQSmartCapture.js

### GAP-C02: Email Infrastructure (Priority 1 — 3-5 days) — ✅ CLOSED
No email sending exists. Twilio handles WhatsApp only.
Commercial need: invoice delivery, statement emails, VAT reminders,
year-end notifications, user invitations, overdue alerts.
Fix: Resend API (resend.com) via new Edge Function send-email.
~R200/month at moderate commercial volume.

> **CLOSED — 10 April 2026 — commit e61d7e6**
> send-email EF v1 deployed. email_logs table live. 6 email buttons across HQ.
> HQEmailLogs cross-tenant viewer. Resend sandbox active.
> Known gap: user_invitation type sends email only — does not create auth account.
> Full auth invite (supabase.auth.admin.inviteUserByEmail) is next-session fix.

### GAP-C03: Supabase Plan Upgrade (Priority 1 — do when ready)
Currently FREE tier: 500MB DB, 1GB storage, 50K EF calls/month.
Must upgrade to Pro ($25/month ≈ R450) before first commercial client.
DO NOT upgrade yet — dev continues for weeks on free tier.
Free tier is sufficient for development and testing.

### GAP-C04: Background Jobs (Priority 2 — 1-2 weeks)
Depreciation: manual button click
Loyalty AI: manual trigger
VAT period: manual
For 100 companies: cannot be manual.
Fix: Enable pg_cron Supabase extension.
CREATE EXTENSION IF NOT EXISTS pg_cron;
Schedule: monthly depreciation, daily loyalty, period VAT triggers.

### GAP-C05: CA Firm Partner Portal (Priority 2 — 4-6 weeks)
CA firms are the distribution channel. They need their own view:
/partner route with partner_firm role scoped to their assigned clients.
Current /hq is platform operator only.
Plan before building. New portal, new role type, new RLS policies.

### GAP-C06: OCR Cost Optimization (Priority 3 — scale concern)
Every Smart Capture document calls Anthropic API.
At 100 clients x 200 docs/month = 20,000 API calls/month.
Estimated cost: R15,000–R40,000/month in API fees at this volume.
Fix: Route simple extractions (petrol slips, till slips) through
Google Vision (~R0.15/page) or AWS Textract (~R0.12/page).
Reserve Anthropic for complex documents and analysis only.
Implement routing layer in process-document Edge Function.

### GAP-C07: Multi-Storefront (Priority 3 — 6-10 weeks)
One Consumer Shop per tenant.
Multiple branded storefronts from one inventory pool: not yet supported.
Channel pricing exists (wholesale/retail/website).
Plan: /shop/:storeId routing, store configurations table, same inventory pool.

### GAP-C08: Bank Feed Integration (Priority 4 — long term)
Manual bank statement import currently.
Direct bank feed (FNB, Nedbank, Standard Bank via Open Banking) would
be a major differentiator. Complex, bank-by-bank integration.
Post-launch roadmap item — not a launch blocker.

---

## RECOMMENDED BUILD SEQUENCE

**Before CA meeting (2 weeks):**
- GAP-C01: Mobile camera capture (PWA + camera input)
- WP-NAV-RESTRUCTURE: Clean up the nav grouping
- Scan analytics (qr_codes join in AINS)

**Before first commercial client:**
- GAP-C02: Email infrastructure
- GAP-C03: Supabase Pro upgrade
- GAP-C04: Background jobs (pg_cron)

**Within 30 days of first client:**
- GAP-C05: CA Firm Partner Portal planning + build

**At scale (50+ clients):**
- GAP-C06: OCR cost optimization routing

**Long term:**
- GAP-C07: Multi-storefront
- GAP-C08: Bank feed integration

---

## SUPABASE FREE TIER LIMITS (for reference)

| Resource | Free Limit | Current Usage | At 100 Tenants |
|---|---|---|---|
| Database | 500MB | 25MB (5%) | ~2.5GB → needs Pro |
| File storage | 1GB | 27MB (3%) | ~2.7GB → needs Pro |
| Edge Function calls | 50K/month | unknown | needs Pro |
| Realtime connections | 200 concurrent | low | needs Pro |
| Pro cost | — | $0 | $25/month (R450) |

---

## STACK VERDICT

The architecture is CORRECT. React + Supabase + PostgreSQL + Edge Functions
is the right stack for this product. The foundation is solid.

What is needed is a set of specific ADDITIONS, not a rebuild:
- Mobile camera UX (small, high impact)
- Email service (small, essential)
- Background jobs (medium, essential for scale)
- CA partner portal (large, essential for distribution strategy)

The "never lose a document" promise is already architecturally implemented.
The platform is commercially complete at the feature level.
The gaps are workflow additions, not architectural changes.

---
*COMMERCIAL-READINESS v1.0 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
