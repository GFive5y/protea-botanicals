# SESSION-STATE v221
## Produced: 10 Apr 2026 — End of session close
## HEAD: 4b1a9fa (last dev commit — GAP-03 resolved)
## Session type: MIXED — dev completion + commercial strategy + deep dive

---

## PLATFORM STATE

- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo · FREE tier (upgrade before commercial)
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **Stack:** React 18 + Supabase JS v2 + React Router v6
- **Deploy:** Auto-deploy via Vercel on push to main
- **Company name (legal, CIPC):** Nu Ai (Pty) Ltd. — NOTE SPACE between Nu and Ai

---

## DEV COMPLETED EARLIER THIS SESSION

All WP-AINS and FIN-AUDIT items completed and pushed in this session.
Full detail in SESSION-STATE_v220.md. Summary:

- WP-AINS v1.0: ALL 6 PHASES COMPLETE
- FIN-AUDIT v1.0: ALL 4 GAPS RESOLVED
- VL-012 logged: RULE 0Q violated (push_files from Claude.ai at session close)

---

## COMMERCIAL STRATEGY WORK (this session)

### Presentation Document Created

A professional 11-page strategic partnership briefing document was
produced for the CA meeting in 2 weeks. Final version: nuai_partnership_v5.html
(in local outputs — NOT committed to repo).

**Correct company name throughout:** Nu Ai (Pty) Ltd. (space between Nu and Ai)
**CIPC registration name:** Nu Ai (Pty) Ltd. — verbatim, not NuAi

**Pricing structure (confirmed):**
- Starter: R3,500/month excl. VAT (1 location)
- Professional: R6,500/month excl. VAT (up to 3 locations)
- Enterprise: R12,500/month excl. VAT (4+ locations / group)

**ARR projections:**
- Year 1 Exit (35 clients): R2,184,000 ARR → valuation R9.8M–R13.1M
- Year 2 Exit (110 clients): R8,580,000 ARR → valuation R51.5M–R68.6M
- Year 3 Exit (160 clients): R14,400,000 ARR → valuation R115M–R144M

**NDA review completed:**
- GFFR NDA template reviewed — 6 issues identified
- Fix before meeting: extend term to 3-5 years, add software/code
  to definitions, update jurisdiction wording (Transvaal → Gauteng),
  add IP non-transfer clause, add injunctive relief clause,
  fix 2022/2017 date discrepancy

**Commercial framing (important for all agents):**
- System is PRE-REVENUE, PRE-LAUNCH
- 0 paying clients currently
- All financial figures shown are from internal test environment
- Vape/nicotine retail is the entry point (NOT cannabis terminology
  in commercial context — too controversial for CA/business audience)
- Industry profile system means same platform serves vape, F&B, retail

### Tech Stack Deep Dive Completed

Full assessment of what the stack can and cannot handle commercially.
See COMMERCIAL-READINESS_v1_0.md for the complete document.

---

## CRITICAL FINDINGS — STACK ASSESSMENT

### What Already Exists (better than expected)

File storage IS already implemented:
- `supplier-documents` bucket: private, 48 files, 26MB stored
- `coa-documents` bucket: public, 2 files
- `capture_queue.image_storage_path`: file path column exists and populated
- `document_log.file_url`: URL column exists
- HMAC fingerprinting: working (document_fingerprint column)
- Duplicate detection: working (1 caught in testing)
- SARS compliance checking: working (sars_compliant, sars_flags)
- Fraud detection: working (fraud_flags)

Current DB/storage usage:
- Database: 25MB (Supabase FREE tier limit: 500MB)
- File storage: 27MB (FREE limit: 1GB)
- At 100 tenants: ~2.5GB DB, ~2.7GB storage → needs Supabase Pro

### 8 Commercial Gaps Identified

Priority 1 — Must have before first commercial client:
GAP-C01: Mobile camera capture — currently upload only, not camera-native
GAP-C02: Email infrastructure — no email sending exists (WhatsApp only)
GAP-C03: Supabase Pro upgrade — free tier insufficient for commercial use

Priority 2 — Must have within 30 days of launch:
GAP-C04: Background jobs — depreciation/loyalty AI/VAT run manually
GAP-C05: CA Firm Partner Portal — CA firms need their own client view

Priority 3 — Before scale (50+ clients):
GAP-C06: OCR cost optimization — Anthropic API for every doc = expensive at scale
GAP-C07: Multi-storefront — single shop per tenant currently
GAP-C08: Bank feed integration — manual bank statement import only

### WP-NAV-RESTRUCTURE (from previous session, still pending)

Sales section missing: Yoco, website orders, wholesale channels
Analytics belongs in Customers (not Reports)
Reorder belongs in Inventory (not Reports)
Reports should be Finance only

### Scan Analytics (from previous session, still pending)

scan_logs has no tenant_id — always join through qr_codes:
SELECT sl.* FROM scan_logs sl
JOIN qr_codes qc ON qc.id = sl.qr_code_id
WHERE qc.tenant_id = '{tenantId}';

---

## SUPABASE PLAN CONTEXT

Currently on FREE tier. DO NOT upgrade yet — dev continues for weeks.
Free tier is sufficient for dev and testing.
Upgrade to Supabase Pro ($25/month ≈ R450) immediately when:
- First commercial client is about to onboard
- Real data (not test data) is about to enter the system

---

## EDGE FUNCTIONS (current versions)

ai-copilot v67 · process-document v53 · auto-post-capture v2
sim-pos-sales v4 · sign-qr v36 · verify-qr v34
send-notification v37 · get-fx-rate v35
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
  VL-012 is the 5th violation. The rule is absolute with no exceptions.
  Session close is not an exception. Docs are not an exception.
  SELF-CHECK before any tool call: "Does this write to GitHub?" → STOP.
- LL-205/206/207/208: standard NuAi rules
- scan_logs: no tenant_id — always join through qr_codes
- Company name: Nu Ai (Pty) Ltd. (with space — CIPC registered)
- Supabase: stay on FREE until ready for first commercial client

---
*SESSION-STATE v221 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
