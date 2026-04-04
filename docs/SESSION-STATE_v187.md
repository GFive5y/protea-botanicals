# SESSION-STATE v187
## NuAi Platform — Protea Botanicals
## Date: April 5, 2026
## Session: v187 — Staff wizard + doc audit + archive

---

# LIVE HEAD
[this commit]  feat(hr): Staff setup wizard
a6d611f  docs: LL-ARCHIVE + MASTER-AUDIT + LL-200/201 restored
76b6383  feat(hr): Timesheets setup wizard
a8cf725  feat(hr): Roster setup wizard
5110090  feat(hr): Session C2 — Hours Monitor

Branch: main
Vercel production: protea-botanicals.vercel.app

---

# COMPLETED THIS SESSION (v187)

## Staff setup wizard (this commit)
FILE: src/components/hq/HRStaffDirectory.js
2 changes: StaffSetupWizard component + empty state replacement.

StaffSetupWizard:
  Trigger: staff.length === 0 (data-driven, no localStorage)
  Dark green header: "Add your team members"
  Subtitle: "Staff profiles are the foundation of everything in the HR module"
  UNLOCKS pills: ⏱ Timesheets · 📅 Roster · 📋 Contracts · 🗓 Leave · 💰 Payroll
  NEEDS grid (8 cards): Full name (Required) + 7 optional fields
  Tip strip: "You only need a name to get started"
  CTA: "Add your first team member →" opens existing HRStaffProfile modal
  No duplicate form — wizard contextualises the action, modal does the work
  Disappears permanently once staff.length > 0

## Documentation audit + archive (commit a6d611f)
Full git history reviewed (v177–v186).

FINDINGS:
  No catastrophic loss. Git history = complete backup of all deleted files.
  Two rules dropped when SESSION-CORE upgraded v2.3 → v2.8:
    LL-124 → restored as LL-200 (cannabis refs on public/Yoco pages)
    LL-125 → restored as LL-201 (Yoco SDK = Android/iOS native only)

ADDED TO GIT (were project-knowledge-only, now permanent):
  docs/LL-ARCHIVE_v1_0.md   — LL-001 to LL-173, full lesson archive
  docs/MASTER-AUDIT_v1_0.md — 30-doc system audit (v177)
  docs/SESSION-LOG_DEFINITIVE.md — new append-only history log

NEW PROCESS (from now):
  SESSION-STATE rotates: create vN+1, delete vN-2 (keep 3 live)
  SESSION-LOG_DEFINITIVE: Claude Code prepends one block per session, never deletes
  Project knowledge: upload SESSION-LOG once (re-upload to refresh), rotate SESSION-STATE

## Wizard pattern — complete for HR module
  HRStaffDirectory.js  ✅ StaffSetupWizard
  HRRoster.js          ✅ RosterSetupWizard
  HRTimesheets.js      ✅ TimesheetSetupWizard
  All 3 follow WIZARD-01–07: data-driven, dark green header, skip escape, onComplete=refetch

---

# CURRENT PLATFORM STATE

## KEY FILES — LIVE
src/components/hq/HRStaffDirectory.js  v1.1  ✅ LIVE — setup wizard added
src/components/hq/HRTimesheets.js      v1.2  ✅ LIVE (76b6383)
src/components/hq/HRRoster.js          v1.1  ✅ LIVE (a8cf725)
src/components/hq/HRCalendar.js        v1.4  ✅ LIVE (811c1e9)
src/components/hq/POSScreen.js         v2.0  ✅ LIVE (0ce48a1)
src/pages/HRDashboard.js               v1.3  ✅ LIVE (0e8f38b)
src/pages/TenantPortal.js              v2.7  ✅ LIVE (0e8f38b)
src/components/hq/LiveFXBar.js              PROTECTED — never modify
src/components/StockItemModal.js            LOCKED — never modify
src/components/PlatformBar.js              LOCKED — never modify

## DOCS — LIVE IN GIT
docs/LL-ARCHIVE_v1_0.md        ✅ NEW — LL-001 through LL-173 permanent archive
docs/MASTER-AUDIT_v1_0.md      ✅ NEW — v177 system audit permanent
docs/SESSION-LOG_DEFINITIVE.md ✅ NEW — append-only session history
docs/SESSION-CORE_v2_11.md     ✅ LL-200/201 restored
docs/SESSION-STATE_v187.md     ← this file (keeps v185 + v186 + v187)
SESSION-STATE_v184.md          DELETED (3-version rotation)

## DB — STAFF/CONTRACT STATE
Protea Botanicals HQ (43b34c33):
  staff_profiles: 1 — Gerhardt Fivaz (f6f2ba40)
  employment_contracts: 0 active — R150/hr contract needs recreating
  shift_templates: 0 → Roster wizard shows
  timesheets: 0 → Timesheets wizard shows

Medi Recreational (b1bad266):
  All HR tables: 0 rows — all 3 wizards will show
  Inventory: 184 SKUs, sell_price R0 (P1 blocker)

## DB — RLS (all HR tables confirmed clean)
9 tables with full HQ user access via is_hq_user():
staff_profiles, employment_contracts, timesheets, timesheet_entries,
hr_diary_entries, shift_schedules, shift_templates, roster_weeks, roster_assignments

---

# NEXT PRIORITIES

## [P1] Recreate Gerhardt's contract
HR → Contracts → New Contract for Gerhardt Fivaz
Contractor · Start: 06 Apr 2026 · End: 27 Jul 2026
Hourly rate: R150/hr · 8h/day · 5d/week

## [P2] Owner actions — block first real sale
☐ Set sell_price on Medi SKUs (most R0 — hero items = LED equipment)
☐ Add real Medi Rec staff profiles (wizard will guide)
☐ Enable Supabase backups (Settings → Add-ons)
☐ Yoco signup → sk_test_ keys
☐ First real POS sale → verify loyalty + session + trading dashboard

## [P3] HR Session D — Shift Cost Calculator
Gate: hourly_rate_zar set on active contract (P1 above first)
Gate: real roster + timesheet entries
Calculates: regular (≤45h) / OT 1.5× / Sunday 1.5× / PH 2× / night 1.33×

## [P4] Operational nudge bar (Layer 2)
Per-module action prompts — smart data reads, no AI, clickable

## [FUTURE]
NuAi AI Copilot (Layer 3)
Decision C: Client 2 storefront — UNRESOLVED
Decision D: Yoco per-tenant vs platform — UNRESOLVED

---

# CRITICAL RULES

## Wizard Pattern
WIZARD-01: Data-driven — shows when data.length === 0, never localStorage
WIZARD-02: Always offer sensible defaults (pre-filled, one-click)
WIZARD-03: Always include "Skip" escape
WIZARD-04: onComplete = refetch data (not close)
WIZARD-05: Dark green header (#1A3D2B) + step indicator = standard
WIZARD-06: Wizard and normal UI mutually exclusive in render tree
WIZARD-07: "No dependency" state handled separately from "no data" state

## RLS Rules
RLS-HQ-01: New table needing HQ access → 4 policies: SELECT/INSERT/UPDATE/DELETE
           USING/WITH CHECK (is_hq_user())
RLS-HQ-02: Confirmed clean: staff_profiles, employment_contracts, timesheets,
           timesheet_entries, hr_diary_entries, shift_schedules,
           shift_templates, roster_weeks, roster_assignments

## Code Rules
RULE 0Q:  GitHub write tools = 403 — never call them
LL-056:   scan_logs NO tenant_id column
LL-059:   user_profiles.loyalty_points = operational truth
LL-120:   All Anthropic API calls via ai-copilot EF — never direct from React
LL-178:   Never change renderTab without loss list + owner confirm
LL-185:   Read file via GitHub MCP before any edit suggestion
LL-196:   fontWeight 300 / 9px labels / 0.3em letterSpacing BANNED
LL-198:   eod_cash_ups variance GENERATED, orders.total not total_amount
LL-200:   ZERO cannabis refs on public/Yoco pages (Visa/MC prohibition)
LL-201:   Yoco SDK = Android/iOS native only — never bundle in React web
POS-01:   POSScreen reads pos_sessions — never writes
POS-02:   Loyalty = 10pts/R1 (Math.floor(total * 10))
POS-03:   awardLoyaltyPoints() non-blocking — sale never fails due to loyalty
POS-04:   Customer lookup uses .ilike("phone", "%phone%") — partial match
POS-05:   Customer state clears after every sale
ROSTER-01: week_start MUST be Monday — use getMondayOf()
ROSTER-02: roster_assignments UPSERT onConflict="roster_week_id,staff_profile_id,work_date"
ROSTER-05: Locked rosters read-only — never write to locked weeks
ROSTER-06: >45h/week = OT (SA BCEA threshold)
PH-03:    Query: .or('tenant_id.eq.X,tenant_id.is.null') — never .eq() alone
DIARY-01: entry_type: note|meeting|reminder|announcement|task ONLY

## File Safety
PlatformBar.js      LOCKED
LiveFXBar.js        PROTECTED
StockItemModal.js   LOCKED
HQStock.js          PROTECTED — read full file before any change

---

# THREE-CLAUDE ECOSYSTEM
Claude.ai   — reads via GitHub MCP + Supabase MCP, diagnoses, writes specs
Claude Code — implements, verifies, commits, pushes
GitHub MCP  — READ ONLY permanently (403 on writes)
Supabase MCP — schema verification, data queries, RLS fixes, migrations

---

# DOCUMENT READ ORDER FOR NEXT SESSION
1. NORTH-STAR_v1_0.md
2. SESSION-STATE_v187.md   ← this file
3. SESSION-CORE_v2_11.md
4. LL-ARCHIVE_v1_0.md      ← new, read once to absorb LL-001–173
5. VIOLATION_LOG_v1_1.md
6. REGISTRY_v3_2.md
7. MANIFEST_v3_0.md

---

*SESSION-STATE v187 · NuAi · April 5, 2026*
*Setup wizard pattern complete across Staff, Roster, Timesheets*
*Doc audit done — nothing lost, LL-200/201 restored, archives in git*
*HEAD: [this commit] · Branch: main*
*Next: recreate Gerhardt contract → owner actions → Session D (cost calculator)*
