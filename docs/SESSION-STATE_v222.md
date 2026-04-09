# SESSION-STATE v222
## Produced: 10 Apr 2026 — session close
## HEAD: 2c7e209
## Session type: GAP-C01 implementation + full brand rename

---

## PLATFORM STATE

- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Live URL:** nuai.vercel.app (renamed from protea-botanicals.vercel.app)
- **Vercel project:** nuai (renamed from protea-botanicals)
- **Supabase:** uvicrqapgzcdvozxrreo · FREE tier
- **Company name (legal, CIPC):** Nu Ai (Pty) Ltd.
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **Stack:** React 18 + Supabase JS v2 + React Router v6

---

## COMPLETED THIS SESSION

### GAP-C01: Mobile Camera Capture — CLOSED (8937ca2)

HQSmartCapture.js:
- Dual input pattern: fileRef (accept image/pdf/heic, NO capture attr)
  + cameraRef (accept="image/*" capture="environment" ONLY)
- Mobile detection via window.innerWidth < 768 || UA check + resize listener
- Mobile UI: "Take Photo" button (cameraRef) + "Upload from Files" (fileRef)
- Desktop UI: drag-drop zone unchanged
- Fixes pre-existing "file or camera" dialog on iOS Safari — caused by mixing
  PDF acceptance with capture="environment" on a single input

public/manifest.json:
- Nu Ai ERP, standalone, portrait-primary, #1A3D2B theme
- start_url: /hq, maskable icons

public/index.html:
- theme-color #1A3D2B, title "Nu Ai", iOS PWA meta tags

### Brand Rename — COMPLETE (2c7e209 + DB + Vercel)

All layers renamed:
- Vercel project: protea-botanicals → nuai → nuai.vercel.app
- DB tenants: "Protea Botanicals HQ" → "Nu Ai HQ" (id: 43b34c33)
- NUAI-AGENT-BIBLE.md: URL updated to nuai.vercel.app
- package.json: name "protea-botanicals" → "nuai"
- GitHub repo: GFive5y/protea-botanicals — LEFT AS IS (breaking to rename)
- Dead nexai-erp Vercel project identified — owner to delete

---

## COMMERCIAL GAPS STATUS

GAP-C01: Mobile camera capture ✅ CLOSED
GAP-C02: Email infrastructure (Resend API) — NEXT PRIORITY
GAP-C03: Supabase Pro upgrade — do when first client onboards
GAP-C04: Background jobs (pg_cron) — before first client
GAP-C05: CA Firm Partner Portal — within 30 days of first client
GAP-C06: OCR cost optimization — at scale
GAP-C07: Multi-storefront — long term
GAP-C08: Bank feed integration — long term

---

## NEXT IMMEDIATE PRIORITY

GAP-C02: Email infrastructure
File to build: new Supabase Edge Function send-email
Service: Resend API (resend.com)
Use cases: invoice delivery, VAT reminders, year-end notifications,
  user invitations, overdue alerts, statement emails
Estimated: 3-5 days per COMMERCIAL-READINESS_v1_0.md

---

## EDGE FUNCTIONS (current versions)

ai-copilot v67 · process-document v53 · auto-post-capture v2
receive-from-capture v1 · sim-pos-sales v4 · sign-qr v36
verify-qr v34 · send-notification v37 · get-fx-rate v35
payfast-checkout v44 · payfast-itn v39

---

## LOCKED FILES (unchanged)

- src/components/StockItemModal.js — LOCKED
- src/components/ProteaAI.js — str_replace only
- src/components/PlatformBar.js — LOCKED
- src/services/supabaseClient.js — LOCKED
- src/components/hq/HQStock.js — PROTECTED
- src/components/hq/LiveFXBar.js — PROTECTED

---

## KEY RULES (permanent)

- RULE 0Q: NEVER call any GitHub write tool from Claude.ai. EVER.
  VL-012 is the 5th violation. Self-check before every tool call.
- LL-205/206/207/208: standard NuAi rules
- Company name: Nu Ai (Pty) Ltd. (space — CIPC registered)
- Live URL: nuai.vercel.app
- Supabase: stay on FREE until ready for first commercial client
- scan_logs: no tenant_id — always join through qr_codes

---
*SESSION-STATE v222 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
