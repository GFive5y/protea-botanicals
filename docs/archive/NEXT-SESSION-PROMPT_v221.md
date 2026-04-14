# NEXT-SESSION-PROMPT v221
## For: Claude Code — new session opening
## Produced: 10 Apr 2026
## Priority: COMMERCIAL READINESS

---

## MANDATORY READING ORDER (before ANY task)

1. docs/PLATFORM-OVERVIEW_v1_0.md    — system orientation
2. docs/NUAI-AGENT-BIBLE.md          — all rules
3. docs/SESSION-STATE_v221.md        — CURRENT state (this file's pair)
4. docs/VIOLATION_LOG_v1_1.md        — what went wrong (VL-012 is latest)
5. docs/COMMERCIAL-READINESS_v1_0.md — the new priority document

Read all five before touching any file.

---

## RULE 0Q — READ THIS BEFORE ANYTHING ELSE

NEVER call any GitHub write tool from Claude.ai.
push_files, create_or_update_file, create_branch, delete_file —
ALL banned. No exceptions. Not for docs. Not for urgent fixes.
Not at session close. VL-012 is the 5th violation. It cannot happen again.

SELF-CHECK before every tool call:
"Does this tool write to the GitHub repository?"
YES → STOP. Write the content in chat as a Claude Code instruction block.
The human runs Claude Code. Claude Code does the write.

---

## PLATFORM IDENTITY

Nu Ai (Pty) Ltd. — production multi-tenant SaaS ERP
CIPC legal name: Nu Ai (Pty) Ltd. (space between Nu and Ai — always)
224,293 lines · 109 DB tables (all RLS) · 6 portals · 4 industry profiles
Repo: github.com/GFive5y/protea-botanicals · branch: main
Supabase: uvicrqapgzcdvozxrreo (FREE tier — DO NOT upgrade yet)
Medi Rec tenant: b1bad266-ceb4-4558-bbc3-22cfeeeafe74

---

## SESSION CONTEXT — WHAT CHANGED IN v221

The v221 session was a turning point. Two types of work happened:

### Dev completions (already pushed)
- WP-AINS v1.0: All 6 phases live — sidebar badges, IntelLines, NuAi mark,
  IntelStrip pills, NuAi panel brief, click-through depth
- FIN-AUDIT v1.0: All 4 gaps resolved — revenue ÷1.15, journal adjustments
  flow, ExpenseManager VAT review, depreciation running
- VL-012 logged: 5th RULE 0Q violation — push_files from Claude.ai

### Commercial strategy work
- Partnership presentation document created (nuai_partnership_v5.html)
- NDA reviewed against GFFR template (6 issues to fix before CA meeting)
- Meeting in 2 weeks with CAs representing big business interests
- Pricing confirmed: Starter R3,500 / Professional R6,500 / Enterprise R12,500

### Stack deep dive — critical findings
- File storage IS already working: supplier-documents bucket has 48 files
- capture_queue has image_storage_path — document archiving is implemented
- Current DB: 25MB, storage: 27MB — comfortable on free tier
- 8 commercial gaps identified — see COMMERCIAL-READINESS_v1_0.md
- KEY DECISION: Stay on Supabase FREE until first real commercial client

---

## NEW IMMEDIATE GOAL: COMMERCIAL READINESS

The CA meeting is in 2 weeks. Dev continues until then.
No real clients. No real data. Free tier is fine.
Goal: build the most solid commercial foundation possible before launch.

**Priority order for this development phase:**

### Priority 1 — Mobile Camera Capture (GAP-C01)
THIS IS THE MOST IMPACTFUL IMMEDIATE TASK.

Smart Capture currently requires file upload. The "scan a receipt in the
restaurant" promise requires camera access on mobile.

Fix: Add `<input type="file" accept="image/*" capture="environment">` to
the Smart Capture upload flow. This triggers the native camera on mobile
browsers without a native app. Also add PWA manifest for home screen install.

Files: src/components/hq/HQSmartCapture.js (read it first — not locked)
Estimated: 2-3 days

### Priority 2 — Email Infrastructure (GAP-C02)
No email exists. Twilio handles WhatsApp only.
For commercial use need: invoice delivery, statement emails,
VAT reminders, year-end notifications, user onboarding.

Fix: Create send-email Edge Function using Resend (resend.com —
has generous free tier, ~R200/month at moderate volume, simple API).
Wire to trigger on: expense approval, VAT period open, year-end close.

Estimated: 3-5 days

### Priority 3 — Background Jobs for Automated Accounting (GAP-C04)
Depreciation runs on button click. Loyalty AI runs on button click.
VAT period calculations are manual. For multiple companies: unworkable.

Fix: Enable pg_cron Supabase extension. Create scheduled jobs for:
- Daily: loyalty AI engine, stock movement summaries
- Monthly: depreciation posting for all tenants
- Period-based: VAT period open/close triggers

SQL to enable:
CREATE EXTENSION IF NOT EXISTS pg_cron;

Schedule example:
SELECT cron.schedule('monthly-depreciation', '0 0 1 * *',
  'SELECT run_monthly_depreciation()');

Estimated: 1-2 weeks

### Priority 4 — WP-NAV-RESTRUCTURE
(From v220 session — still pending)

Current nav grouping is wrong:
- Sales: missing Yoco, website, wholesale channels
- Analytics: belongs with Customers, not Reports
- Reorder: belongs with Inventory, not Reports
- Reports: should be Finance only

Must read TenantPortal.js waterfall config before writing anything.
Must check impact on useIntelStrip tabIds, useBrief tabIds,
ProteaAI getSuggested(), NuAiBrief CONTEXT_MAP (24 entries).

### Priority 5 — Scan Analytics (qr_codes join)
(From v220 session — still pending)

scan_logs has NO tenant_id column — platform architecture decision.
Scope through: scan_logs.qr_code_id → qr_codes.id → qr_codes.tenant_id

Add to: useNavIntelligence.js, useIntelStrip.js (analytics case), useBrief.js

### Priority 6 — CA Firm Partner Portal (GAP-C05)
If CA firms are the distribution channel, they need their own portal.
A /partner route with a partner_firm role that scopes HQ to their
assigned clients only.

This is significant work (4-6 weeks) — plan it before building.

---

## AINS ARCHITECTURE REMINDER

If any nav tab IDs change (WP-NAV-RESTRUCTURE), these all need updating:
- src/hooks/useIntelStrip.js — tabId switch (12 tabs)
- src/hooks/useBrief.js — tabId coverage
- src/components/ProteaAI.js — getSuggested() tab name mapping
- src/components/NuAiBrief.js — CONTEXT_MAP (24 entries)

---

## COMMERCIAL CONTEXT FOR ALL AGENTS

All agents must understand the Nu Ai commercial context:

COMPANY: Nu Ai (Pty) Ltd. — space in name, always
STAGE: Pre-revenue, pre-launch, dev/test only
CLIENTS: 0 paying clients, 5 test deployments
REAL DATA: None — Supabase has test data only
MEETING: CA group in 2 weeks — partnership/investment discussion
FRAMING: Vape and nicotine retail (NOT cannabis language in commercial docs)
PRICING: Starter R3,500 / Pro R6,500 / Enterprise R12,500 per month

The platform is commercially complete at the feature level.
What is needed is: mobile camera UX, email, background jobs,
partner portal, and nav cleanup — then it is ready for first client.

---

## LIVE DATA (Medi Rec — 10 Apr 2026)

- Orders: 468 · MTD 141 · Today 10 · Today revenue R13,520
- MTD Revenue (ex-VAT): R133,691 · Gross margin: 44.6%
- Inventory: 187 active · 1 OOS (Bubble Hash 1g) · 6 below reorder
- Depreciation: R822.22/month running (3 assets)
- Storage: 48 supplier documents stored (26MB)
- DB size: 25MB total

---

## SESSION OPENING SEQUENCE

git status — confirm clean tree
git log --oneline -3 — confirm at 4b1a9fa or later
Read all 5 mandatory docs
Begin Priority 1: Mobile Camera Capture in HQSmartCapture.js

---
*NEXT-SESSION-PROMPT v221 · Nu Ai (Pty) Ltd. · 10 Apr 2026*
