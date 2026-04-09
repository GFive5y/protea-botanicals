# SESSION-STATE v224
## Produced: 10 Apr 2026 — final session close (02:00 SAST)
## HEAD: e5ef1fe (last code commit — SESSION-STATE v224 docs only after this)
## Session type: Long session — GAP-C01 + brand rename + deep bug hunt

---

## PLATFORM STATE

- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Real live URL:** nuai-gfive5ys-projects.vercel.app
- **WARNING:** nuai.vercel.app belongs to a DIFFERENT person's Next.js app
  Do NOT use nuai.vercel.app — it is not this system
- **Vercel project:** nuai (prj_M2qcKbX8LOylzSxwIRisXhs4JQ40)
- **Supabase:** uvicrqapgzcdvozxrreo · FREE tier
- **Company name (legal, CIPC):** Nu Ai (Pty) Ltd.

---

## ALL COMMITS THIS SESSION

| Commit | What |
|---|---|
| 8937ca2 | GAP-C01: mobile camera capture + PWA manifest |
| 2c7e209 | Brand rename: nuai.vercel.app ref, package.json |
| fb6ddb0 | SESSION-STATE v222 |
| e5ef1fe | SmartCapture FK fix: vendor_matched_id null, real error msg, em-dash |

---

## DB CHANGES THIS SESSION (no code commit — applied via Supabase MCP)

1. Migration: hq_bypass_capture_queue_document_log
   - CREATE POLICY "hq_all_capture_queue" ON capture_queue FOR ALL TO public USING (is_hq_user())
   - CREATE POLICY "hq_all_document_log" ON document_log FOR ALL TO public USING (is_hq_user())
   - Root cause: LL-205 was never applied to these tables — HQ operator
     (switched to Medi Rec context) was blocked from inserting into capture_queue

2. tenants: "Protea Botanicals HQ" → "Nu Ai HQ" (id: 43b34c33)

3. auth.users: fivazg@gmail.com password reset to NuAi2026! ($2a$10$ hash)
4. auth.users: admin@protea.dev password reset to admin123 ($2a$10$ hash)

5. Supabase Auth → URL Configuration:
   - Site URL: http://localhost:3000 → https://nuai.vercel.app
   - Redirect URLs: added https://nuai.vercel.app/**
   NOTE: nuai.vercel.app is someone else's site. This redirect config
   needs updating to https://nuai-gfive5ys-projects.vercel.app/** or
   a custom domain once purchased.

6. Auth Rate Limits: sign-in rate increased to 200 requests/5 min

---

## SMARTCAPTURE — FULLY WORKING (confirmed 02:00 SAST)

End-to-end flow confirmed on mobile and desktop:
- Camera opens directly (no file/camera dialog) ✓
- File uploads to supplier-documents bucket ✓
- process-document EF v53 extracts data ✓
- capture_queue INSERT succeeds ✓
- Review UI renders with SARS badge, duplicate detection ✓
- Duplicate fingerprint correctly blocked re-submission ✓

Two bugs found and fixed this session:
1. vendor_matched_id: EF v53 returns hallucinated supplier UUIDs → FK violation
   Fix: always null on insert (e5ef1fe)
2. capture_queue RLS: HQ operator blocked from cross-tenant insert
   Fix: hq_all_capture_queue policy (DB migration)

New LLs:
- LL-209: vendor_matched_id always null on capture_queue insert
- LL-210: capture_queue and document_log require hq_all_ LL-205 bypass policies
  Add to LL-205 standard checklist for all new sessions

---

## URL SITUATION — IMPORTANT

nuai.vercel.app = someone else's Next.js app. Not ours. Never use it.
nuai-gfive5ys-projects.vercel.app = correct production URL.

Custom domain is required before CA meeting.
Recommended: app.nuai.co.za — purchase domain, add to Vercel project,
update Supabase Site URL and redirect URLs to match.

---

## COMMERCIAL GAPS STATUS

GAP-C01: Mobile camera capture ✅ FULLY CLOSED
GAP-C02: Email infrastructure (Resend API) — NEXT PRIORITY
GAP-C03: Supabase Pro — when first client onboards
GAP-C04: Background jobs (pg_cron) — before first client
GAP-C05: CA Firm Partner Portal — within 30 days of first client
GAP-C06/07/08: Scale items — long term

---

## OUTSTANDING BEFORE CA MEETING

Priority 1 — owner actions:
- Purchase custom domain (app.nuai.co.za or similar)
- Add domain to Vercel project settings
- Update Supabase Site URL and redirect URLs to new domain
- Delete nexai-erp Vercel project (dead experiment)
- Replace public/logo192.png and public/logo512.png with Nu Ai branded icons

Priority 2 — dev (next session):
- GAP-C02: Resend API email Edge Function
- WP-NAV-RESTRUCTURE: clean nav for CA demo
- Fix meta description: "Web site created using create-react-app"
- Update AGENT-BIBLE with LL-209, LL-210, correct live URL

---

## KEY ACCOUNTS

admin@protea.dev — password: admin123 — hq_access: true
fivazg@gmail.com — password: NuAi2026! — hq_access: true

---

## EDGE FUNCTIONS (current versions)

ai-copilot v67 · process-document v53 · auto-post-capture v2
receive-from-capture v1 · sim-pos-sales v4 · sign-qr v36
verify-qr v34 · send-notification v37 · get-fx-rate v35
payfast-checkout v44 · payfast-itn v39

---

## KEY RULES

- RULE 0Q: NEVER call any GitHub write tool from Claude.ai. EVER.
  VL-012 is the 5th violation. Self-check before every tool call.
- LL-205: every new table needs hq_all_ RLS bypass policy
- LL-209: vendor_matched_id always null on capture_queue insert
- LL-210: capture_queue + document_log need hq_all_ bypass policies
- Company: Nu Ai (Pty) Ltd. · Real URL: nuai-gfive5ys-projects.vercel.app

---
*SESSION-STATE v224 · Nu Ai (Pty) Ltd. · 10 Apr 2026 · 02:00 SAST*
