# SESSION-STATE v203 — 08 Apr 2026

## Stack & Identifiers
- **Repo:** github.com/GFive5y/protea-botanicals · branch: main
- **Supabase:** uvicrqapgzcdvozxrreo
- **Medi Rec tenant:** b1bad266-ceb4-4558-bbc3-22cfeeeafe74
- **Live URL:** protea-botanicals-git-main-gfive5ys-projects.vercel.app

---

## Session Apr 8 2026 — WP-SMART-CAPTURE Session 1 Complete

### Commits This Session

| SHA | Description |
|---|---|
| `8f28446` | HQSmartCapture.js v1 — mobile camera UI, AI extraction, SARS badge |
| `9740ddb` | Session 2 — process-document v50, auto-post-capture EF, policy engine |
| `0fdaac6` | Fix: Smart Capture Operations nav + crash guards + policy flags |
| `855fb9b` | Fix: Smart Capture in generic waterfall |
| `7a976d6` | Fix: process-document tenant_id + tenantId guard |
| `842aa5c` | Fix: capture_queue null coalescing + error logging |
| `176f059` | Anti-fraud v2.1 — UTI extraction, fingerprinting, duplicate detection |
| `a488768` | Refined — SA bank identifiers, 6-level confidence, improved DuplicateBanner |

---

## What Was Built — WP-SMART-CAPTURE

Photo any document → AI reads → posts to books. One photo = expense + journal + VAT.

### Edge Functions
- **process-document v2.1**: SARS compliance + SA bank identifiers + 6-level fingerprint + duplicate detection
- **auto-post-capture v1**: Atomic accounting (expense + journal + VAT). Balance check. Idempotent.

### Anti-Fraud: 3-Layer Duplicate Detection
- L1: Image hash (same photo)
- L2: 6-level fingerprint (UTI 100% → Auth+Date 99.9% → composite 80%)
- L3: Semantic (vendor+date+amount within 30d)
- DuplicateBanner blocks approve button

### Capture Rules: 10 active
4 auto-categorise + R1K threshold + entertainment approval + VAT flag + 3 anti-fraud

### First Test: Sasol petrol slip
R1,000 Unleaded 95 · Auth Code 099243 · Fingerprint: auth:099243:2024-11-19 (L2, 99.9%)
SARS: non-compliant (pump slip, no VAT number) · Input VAT correctly blocked

---

## Outstanding
- P1: capture_queue insert intermittent failure — re-test after a488768
- P2: Supplier invoice → PO match → stock received
- P3: Year-End Close, Yoco keys, WP-LOYALTY-ENGINE v2

---

*SESSION-STATE v203 · NuAi · 08 Apr 2026*
