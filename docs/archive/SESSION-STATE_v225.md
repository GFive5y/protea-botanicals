# SESSION-STATE v225
## Produced: 10 Apr 2026 — GAP-C02 close
## Previous: v224 (HEAD e5ef1fe)
## Session type: GAP-C02 Email Infrastructure — build + deploy

---

## PLATFORM STATE

- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Live URL:** nuai-gfive5ys-projects.vercel.app (custom domain pending)
- **Vercel project:** nuai (prj_M2qcKbX8LOylzSxwIRisXhs4JQ40)
- **Supabase:** uvicrqapgzcdvozxrreo · FREE tier
- **Company:** Nu Ai (Pty) Ltd.
- **Supabase Site URL:** ✅ now nuai-gfive5ys-projects.vercel.app (fixed this session)

---

## GAP-C02 — CLOSED ✅

Email infrastructure shipped end-to-end via Resend.

### New Edge Function

- **send-email v1** — deployed ACTIVE, `verify_jwt: true`
- Mirrors send-notification structure (bearer auth first, inline errors,
  service-role supabase client, UPPERCASE_UNDERSCORE secrets)
- Types handled:
  - CLIENT_FACING: invoice_delivery, overdue_payment_alert, statement_email
  - INTERNAL: vat_reminder, year_end_notification, user_invitation
- Cooldown windows (hours) queried against email_logs before sending:
  - invoice_delivery 24 · vat_reminder 168 · year_end_notification 168
  - user_invitation 24 · overdue_payment_alert 48 · statement_email 24
- Reply-to split:
  - CLIENT_FACING → payload.tenantContactEmail (required)
  - INTERNAL → admin@protea.dev
- PDF attachment: fetch URL → base64 → inline on Resend call, 5MB hard cap
- Every send writes email_logs row (status='sent' | 'failed', resend_id, error)

### New DB Table (owner-applied via Supabase dashboard)

email_logs (id, tenant_id, type, recipient, subject, status, resend_id,
error, metadata, sent_at, created_at)
+ index on (tenant_id, type, sent_at desc)
+ RLS enabled
+ hq_all_email_logs policy (LL-205 bypass — HQ sees all)
+ tenant_read_email_logs policy (tenants see their own)

### New Secrets (Supabase vault)

- RESEND_API_KEY
- RESEND_FROM_ADDRESS (onboarding@resend.dev sandbox for now)
- APP_URL (https://nuai-gfive5ys-projects.vercel.app)

### New Frontend Files

- src/services/emailService.js — single wrapper, typed helpers
- src/components/hq/HQEmailLogs.js — cross-tenant log viewer
  (KPI strip, filters: status/type/tenant, expandable detail rows)

### Wired — one additive button per target file (no existing logic touched)

- HQInvoices.js: 📧 on invoice row (invoice_delivery)
                 + 📧 Send Overdue Alert on AR overdue banner
- HQVat.js: 📧 Email Reminder on VAT period summary actions
- HQYearEnd.js: 📧 Email Year-End Notification on post-close success screen
- HQTenants.js: ✉ Invite User on each tenant row (user_invitation)
- HQFinancialStatements.js: 📧 Email Statement next to Print/Save PDF
- HQDashboard.js + useNavConfig.js: new Email Logs tab in Platform group

### CODEBASE_FACTS update (ProteaAI.js str_replace only)

- EF count corrected: 14 active (not 11)
  Full list: ai-copilot v67, auto-post-capture v2, process-document v53,
  sim-pos-sales v4, sign-qr v36, verify-qr v34, send-notification v37,
  get-fx-rate v35, payfast-checkout v44, payfast-itn v39,
  receive-from-capture v1, loyalty-ai v2, create-admin-user v1, send-email v1
- 42 HQ tabs (was 41 — email-logs added)
- GAP-C02 marked CLOSED

---

## BUILD VERIFICATION

CI=false npm run build → ✅ passes
Bundle delta: +3.73 kB main.js
No new warnings introduced.

---

## LL ADDITIONS THIS SESSION

- **LL-211**: Every frontend email send path routes through src/services/emailService.js.
  Never call supabase.functions.invoke("send-email") directly from a component.
- **LL-212**: send-email EF validates bearer token FIRST (before parsing body).
  Any new EF that touches PII or external services must do the same.
- **LL-213**: PDF attachments are fetched server-side in the EF (URL → base64 → attach),
  never base64-encoded in the browser. 5MB hard cap in the EF.

---

## COMMERCIAL GAPS STATUS

GAP-C01: Mobile camera capture ✅ CLOSED (v224)
GAP-C02: Email infrastructure ✅ CLOSED (v225 — this session)
GAP-C03: Supabase Pro — when first client onboards
GAP-C04: Background jobs (pg_cron) — before first client
GAP-C05: CA Firm Partner Portal — within 30 days of first client
GAP-C06/07/08: Scale items — long term

---

## OUTSTANDING BEFORE CA MEETING

Priority 1 — owner actions:
- Purchase custom domain (app.nuai.co.za or similar) + add to Vercel
- Update Supabase Site URL to custom domain once purchased
- Upgrade RESEND_FROM_ADDRESS from sandbox to verified domain sender
- Delete nexai-erp Vercel project (dead experiment)
- Replace public/logo192.png and logo512.png with Nu Ai branded icons
- Fix meta description in public/index.html ("Web site created using create-react-app")

Priority 2 — dev (next session):
- WP-NAV-RESTRUCTURE: clean nav grouping for CA demo
- Supabase Pro upgrade prep (GAP-C03)
- pg_cron background jobs (GAP-C04)
- Update NUAI-AGENT-BIBLE with LL-209/210/211/212/213 + 14 EFs + email infra

---

## KEY ACCOUNTS

admin@protea.dev — password: admin123 — hq_access: true
fivazg@gmail.com — password: NuAi2026! — hq_access: true

---

## EDGE FUNCTIONS (14 active, verified live 10 Apr 2026)

| EF | Version | Purpose |
|---|---|---|
| ai-copilot | v67 | All Claude API calls |
| process-document | v53 | Smart Capture AI extraction |
| auto-post-capture | v2 | Atomic accounting on capture approve |
| receive-from-capture | v1 | Stock receipt + AVCO on delivery note |
| sim-pos-sales | v4 | POS sales simulator |
| sign-qr | v36 | QR HMAC signing |
| verify-qr | v34 | QR validation + scan logging |
| send-notification | v37 | WhatsApp via Twilio |
| get-fx-rate | v35 | Live FX rates, 60s cache |
| payfast-checkout | v44 | PayFast checkout init |
| payfast-itn | v39 | PayFast webhook handler |
| loyalty-ai | v2 | Nightly loyalty AI engine |
| create-admin-user | v1 | Admin user provisioning |
| **send-email** | **v1** | **GAP-C02: Resend email infra (NEW)** |

---

## KEY RULES

- RULE 0Q: NEVER call any GitHub write tool from Claude.ai. EVER.
  VL-012 is the 5th violation. Self-check before every tool call.
- LL-205: every new table needs hq_all_ RLS bypass policy
- LL-209: vendor_matched_id always null on capture_queue insert
- LL-210: capture_queue + document_log need hq_all_ bypass policies
- LL-211: email sends route through src/services/emailService.js
- LL-212: EFs validate bearer token before parsing body
- LL-213: PDF attachments fetched server-side in EF, 5MB cap

---
*SESSION-STATE v225 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
*GAP-C02 Email Infrastructure closed end-to-end*
