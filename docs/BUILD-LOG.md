# NuAi Build Log
## Canonical record of what was built in each session
## Future agents: read this BEFORE SESSION-STATE to understand platform history

---

## Glossary (read once — used throughout this file)

| Term | Meaning |
|---|---|
| EF | Edge Function — TypeScript serverless function in supabase/functions/, deployed to Supabase's edge network. NuAi's backend compute layer. |
| WP | Work Package — a named body of work spanning multiple sessions (e.g. WP-FINANCIALS, WP-NAV-RESTRUCTURE) |
| GAP-Xnn | A gap identified in COMMERCIAL-READINESS_v1_0.md that must be closed before commercial launch |
| LL-nnn | Lesson Learned — a numbered rule in NUAI-AGENT-BIBLE.md derived from a past mistake |
| RLS | Row Level Security — Postgres policy that restricts which rows each user role can read/write |
| LL-205 | Every new DB table needs a hq_all_ RLS bypass policy for the HQ operator role |
| AVCO | Average Cost — inventory valuation method, recalculated by DB trigger on every stock movement |
| IFRS | International Financial Reporting Standards — the accounting framework NuAi's financial suite targets |

---

## Session v224 — 10 April 2026
**Commit:** e61d7e6  
**HEAD after session:** e61d7e6  
**Work package:** GAP-C02 (Commercial Readiness — Communication gap)  
**Status:** CLOSED

### What was built

GAP-C02 closed the email infrastructure gap identified in COMMERCIAL-READINESS_v1_0.md.
Before this session, NuAi had no mechanism to send transactional emails.
Password reset emails were broken (Supabase Site URL pointed to a different person's app).

**New Edge Function — send-email v1**
File: supabase/functions/send-email/index.ts
- Mirrors send-notification (v37) in structure — same auth pattern, same error shape
- Validates bearer JWT before any work (verify_jwt: true — NOTE: all other EFs are verify_jwt: false)
- Cooldown check: queries email_logs before calling Resend — prevents duplicate sends
- Cooldown windows per type: invoice_delivery 24h, vat_reminder 168h, year_end_notification 168h,
  user_invitation 24h, overdue_payment_alert 48h, statement_email 24h
- Reply-to split: CLIENT_FACING types (invoice_delivery, overdue_payment_alert, statement_email)
  use payload.tenantContactEmail; INTERNAL types use admin@protea.dev
- PDF attachment: fetches bytes from pdfUrl, base64 encodes, attaches. Hard cap 5MB.
- Logs every send attempt to email_logs (status: sent | failed)
- Secrets: RESEND_API_KEY, RESEND_FROM_ADDRESS, APP_URL

**New DB table — email_logs**
Applied directly via Supabase MCP (no migration file — project has no migrations directory).
Columns: id, tenant_id, type, recipient, subject, status, resend_id, error, metadata, sent_at, created_at
RLS: hq_all_email_logs (LL-205 bypass) + tenant_read_email_logs + tenant_insert_email_logs
Indexes: (tenant_id, type, sent_at desc), (recipient, sent_at desc)

**New service — src/services/emailService.js**
Single wrapper around supabase.functions.invoke('send-email').
Typed convenience helpers for each email type.
All frontend call sites use this — never invoke the EF directly.

**New HQ component — src/components/hq/HQEmailLogs.js**
Cross-tenant email audit log viewer.
KPI strip (total / sent / failed), filters by status / type / tenant.
Expandable detail row: resend_id, error, metadata JSON.
No tenant_id prop (LL-207). Uses hq_all_email_logs RLS policy.

**Nav wiring**
src/pages/HQDashboard.js + src/hooks/useNavConfig.js
New 'email-logs' tab in Platform group. Wired to HQEmailLogs.
Existing tabs untouched.

**Additive email buttons (6 files, no existing logic changed)**
- HQInvoices.js: Email button per invoice row (invoice_delivery) + Send Overdue Alert on AR banner (overdue_payment_alert)
- HQVat.js: Email Reminder on VAT period summary (vat_reminder)
- HQYearEnd.js: Email Notification on post-close success screen (year_end_notification)
- HQTenants.js: Invite User per tenant row (user_invitation)
- HQFinancialStatements.js: Email Statement next to Print/Save PDF (statement_email)

**ProteaAI CODEBASE_FACTS str_replace**
EF count updated 10→11 (later corrected to 14 after live audit).
send-email v1 listed. ai-copilot bumped to v67.

### Owner actions completed this session
1. email_logs table applied via Supabase MCP
2. Secrets added to Supabase vault: RESEND_API_KEY, RESEND_FROM_ADDRESS, APP_URL
3. send-email EF deployed: supabase functions deploy send-email
4. Supabase Site URL fixed: nuai.vercel.app → nuai-gfive5ys-projects.vercel.app (unbreaks password reset)

### Known issues found during session (not yet fixed)
1. INVITE USER button (HQTenants.js) calls send-email EF — sends a notification email only.
   Does NOT call supabase.auth.admin.inviteUserByEmail(). Recipient gets an email but
   no Supabase auth account is created and no portal access is granted.
   FIX REQUIRED: replace with real Supabase auth invite + send branded welcome via send-email.

2. send-email EF has verify_jwt: true — all other EFs are verify_jwt: false.
   On localhost, JWT may not pass correctly. This caused the first test invite to
   fail silently (email_logs remained empty). Test from production URL, not localhost.

3. From address is sandbox (onboarding@resend.dev). Cannot use branded address until
   nuai.co.za domain is purchased and verified in Resend.
   Switch is a single secret update — RESEND_FROM_ADDRESS → noreply@nuai.co.za

### Live EF inventory after this session (14 total)
ai-copilot v70, payfast-checkout v47, payfast-itn v42, sign-qr v39, verify-qr v37,
send-notification v40, get-fx-rate v38, process-document v56, sim-pos-sales v7,
create-admin-user v4, auto-post-capture v5, receive-from-capture v4, loyalty-ai v5,
send-email v1

---
*BUILD-LOG.md · NuAi · Created 10 April 2026*
*Append new sessions below — never edit entries above the line*
