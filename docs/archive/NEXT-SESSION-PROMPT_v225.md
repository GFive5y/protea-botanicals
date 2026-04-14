# NEXT SESSION START PROMPT — v225
## Use this as the opening message for the next Claude session
## Updated: 10 Apr 2026 · Previous HEAD: e5ef1fe + GAP-C02 commit

---

Read the following documents from the repo in this exact order
before doing anything else:

1. docs/NUAI-AGENT-BIBLE.md
2. docs/SESSION-STATE_v225.md
3. docs/VIOLATION_LOG_v1_1.md
4. docs/COMMERCIAL-READINESS_v1_0.md

Confirm you have read all four, then state:
- Current HEAD commit
- The immediate priority
- What RULE 0Q is and the current violation count (5)
- The correct live URL: nuai-gfive5ys-projects.vercel.app
- Current EF count: 14 active

---

## WHERE WE ARE (as of SESSION-STATE v225)

GAP-C01 ✅ CLOSED — mobile camera capture (v224)
GAP-C02 ✅ CLOSED — email infrastructure (v225, this just-shipped work)

Live EFs: 14 active, send-email v1 deployed with verify_jwt: true.
email_logs table live in production with LL-205 hq_all bypass policy.
Supabase Site URL fixed: nuai-gfive5ys-projects.vercel.app.

---

## IMMEDIATE PRIORITY (P1) — WP-NAV-RESTRUCTURE

CA meeting is the forcing function. The nav needs a clean grouping pass
for a confident live demo.

Spec goals (owner to confirm before build):
- Collapse operational vs financial vs platform groupings
- Surface Email Logs, Smart Capture, VAT, Financial Statements,
  Year-End Close as first-class tabs, not buried
- Ensure sidebar reads as a product tour, not a dev dump
- Keep all existing tab IDs intact (LL-178/179 — never hijack cases)

Files of interest:
- src/hooks/useNavConfig.js (HQ_PAGES array, 426 lines)
- src/pages/HQDashboard.js (TABS array + renderTab, 313 lines)

Rules in force:
- LL-178 / LL-179: never replace a renderTab case — only add new cases
- RULE 0K: list everything lost before touching any renderTab case

Before touching anything: read HQDashboard.js and useNavConfig.js
in full, produce a plain-English before/after grouping map, get owner
sign-off, THEN edit.

---

## SECONDARY PRIORITIES (if WP-NAV-RESTRUCTURE lands)

1. **GAP-C04 — pg_cron background jobs**
   - Nightly loyalty-ai run (Rule from NUAI-AGENT-BIBLE Section 8)
   - Depreciation catch-up scheduling
   - VAT period close reminder (uses send-email EF now)
   - Overdue payment alert sweep (uses send-email EF now)

2. **Meta description fix in public/index.html**
   - Current: "Web site created using create-react-app"
   - Change to Nu Ai branded description

3. **AGENT-BIBLE refresh**
   - Add LL-209 through LL-213
   - Update EF count from 10 → 14
   - Update live URL (remove nuai.vercel.app everywhere)
   - Add send-email EF to the EF table with v1 + contract

4. **GAP-C03 — Supabase Pro upgrade prep**
   - Enable backups (Settings → Add-ons)
   - Verify RLS on any new tables added since last audit
   - Check vault for stale secrets

---

## OWNER ACTIONS STILL PENDING

- Purchase custom domain (app.nuai.co.za or similar)
- Add domain to Vercel project settings
- Update Supabase Site URL + redirect URLs to new domain
- Upgrade RESEND_FROM_ADDRESS from onboarding@resend.dev sandbox
  to a verified domain sender (e.g. no-reply@app.nuai.co.za)
- Delete nexai-erp Vercel project (dead experiment)
- Replace public/logo192.png + logo512.png with Nu Ai branded icons

---

## KEY FACTS TO CARRY

- Company: Nu Ai (Pty) Ltd.
- Live URL: nuai-gfive5ys-projects.vercel.app
  (nuai.vercel.app belongs to someone else — NEVER use it)
- Supabase: uvicrqapgzcdvozxrreo · FREE tier
- HQ tenant: 43b34c33-6864-4f02-98dd-df1d340475c3
- 14 EFs · 110 DB tables · 42 HQ tabs · 6 portals

### Email infra quick reference (for any follow-up work)

- Single entry point: `src/services/emailService.js` (LL-211)
- Convenience helpers exported:
  - `sendInvoiceEmail`, `sendStatementEmail`, `sendVatReminderEmail`
  - `sendYearEndEmail`, `sendUserInvitationEmail`, `sendOverduePaymentEmail`
- Types:
  - CLIENT_FACING (needs tenantContactEmail): invoice_delivery,
    overdue_payment_alert, statement_email
  - INTERNAL (reply-to admin@protea.dev): vat_reminder,
    year_end_notification, user_invitation
- Cooldown hours: 24/168/168/24/48/24 respectively
- PDF: pass `pdfUrl` + `pdfName`, EF fetches + base64 + attaches (5MB cap)
- HQ Email Logs viewer: /hq?tab=email-logs

---

## CRITICAL RULES TO READ FIRST

RULE 0Q — NEVER call GitHub write tools from Claude.ai. 5 violations logged.
          Session close is not an exception. Docs are not an exception.
          Write content in chat as a Claude Code instruction block.

LL-178/179 — New nav = new entries + new cases. Never replace existing.
LL-205 — Every new DB table needs hq_all_ RLS bypass policy.
LL-211 — All email sends go through emailService.js.
LL-212 — EFs validate bearer token before parsing body.
LL-213 — PDF attachments fetched server-side in EF, 5MB cap.

---
*NEXT-SESSION-PROMPT v225 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
*GAP-C02 shipped · Next: WP-NAV-RESTRUCTURE for CA demo*
