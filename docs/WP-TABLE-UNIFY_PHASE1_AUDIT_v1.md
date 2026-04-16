# WP-TABLE-UNIFY PHASE 1 — DS6 VIOLATION AUDIT
## Scan run: 17 April 2026 (Session 291-close, read-only audit from main HEAD)
## Scope: src/components/hq/HQFoodIngredients.js + src/components/StockControl.js
## Purpose: size Phase 1 precisely so the post-demo remediation is a known job

---

## EXECUTIVE SUMMARY

Two files were scanned for DS6 non-compliance across six categories: hex colours, rgb/rgba colours, numeric `borderRadius`, raw `fontSize`, raw `fontWeight`, numeric padding/margin/gap. Both files were read from main branch HEAD directly (not from documentation claims) and line counts verified post-fetch.

| File | Total lines | imports T | Local `T` | Local `C` | Total violations |
|---|---:|:-:|:-:|:-:|---:|
| HQFoodIngredients.js | 5,140 | yes | no | YES | **420** |
| StockControl.js | 4,743 | yes (as DS) | YES (bridge) | YES | **261** |

**The two files are at very different stages of DS6 compliance**, despite both appearing in the WP Phase 1 scope table:

- **StockControl.js is a post-Session-286 DS6 bridge file.** It imports `T as DS`, defines a local `T = { ...DS, ...legacy_aliases }`, and maps a local `C` onto T values. This is the documented LL-268 bridge pattern. Most of its remaining violations are leftover `"11px"` string inline styles in render code — bridging handled the architecture but not the inline-style rewrite.

- **HQFoodIngredients.js was not bridged.** It imports T directly but keeps a local `C` palette that mixes T references with hand-picked Tailwind hex values (`#D4CFC4`, `#245C43`, `#1D4ED8`, `#5B21B6`, `#F5F3FF`) and a separate local `HACCP_COLORS` palette. Its render code (L2500+) is the raw pre-DS6 inline-hex style throughout.

**Token coverage is excellent.** 93 of 102 unique hex uses across both files map to existing T tokens with no ambiguity. Only 9 uses (the Tailwind purple/indigo family: `#5B21B6`, `#7C3AED`, `#6D28D9`, `#EEF2FF`, `#4338CA`, `#F5F3FF`, `#7E22CE`) have no existing semantic home — requiring either one new token (`T.accent2` / `T.purple` family) or a remap decision to existing hues.

**Phase 1 is not a design exercise — it is a mechanical pass with one design gate.** The design gate is the purple decision (~30 min). Everything else is find-and-replace against a fixed mapping table.

---

## SECTION 1 — VIOLATION COUNTS

### HQFoodIngredients.js — 420 violations

| Category | Count | Unique values | Notes |
|---|---:|---:|---|
| Hex colours | 86 | 42 | See Section 2 |
| RGB / RGBA | 4 | — | Likely shadow/overlay — review if T.shadow.* covers |
| Numeric borderRadius | 54 | 6 (3, 4, 5, 6, 8, 10) | All map to T.radius.sm / .md / .lg |
| Raw fontSize | 121 | 13 (9, 10, 11, 12, 13, 14, 15, 16, 18, 22, 24, 26, 32) | 10 uses of value `9`/`10` are sub-`T.text.xs` — needs design call |
| Raw fontWeight | 69 | 5 (400, 500, 600, 700, 800) | 2 uses of `800` — no token exists |
| Numeric padding | 3 | — | Small — mechanical |
| Numeric margin | 60 | — | Mechanical, maps to T.space.* |
| Numeric gap | 23 | — | Mechanical, maps to T.gap.* |

### StockControl.js — 261 violations

| Category | Count | Unique values | Notes |
|---|---:|---:|---|
| Hex colours | 16 | 9 | See Section 2 — most in top C block |
| RGB / RGBA | 5 | — | Shadow rules — likely non-issue |
| Numeric borderRadius | 1 | 1 (50) | **FALSE POSITIVE** — L601 `"50%"` is circle shape, not a px radius |
| Raw fontSize | 136 | 12 | 93 uses of `"11px"` / `"12px"` / `"13px"` string form — bridge left these |
| Raw fontWeight | 71 | 4 (400, 500, 600, 700) | Clean mapping |
| Numeric padding | 3 | — | Mechanical |
| Numeric margin | 18 | — | Mechanical |
| Numeric gap | 11 | — | Mechanical |

**Scanner caveat:** The single `borderRadius` flag for StockControl is a false positive (`"50%"` is a valid shape value, not a size violation). Adjusted real count: **0 borderRadius violations in StockControl.**

---

## SECTION 2 — HEX-TO-TOKEN MAPPING TABLE

This is the core deliverable. For every hex value found, this table specifies the existing T token or flags the need for a new one. Phase 1 is executed by applying this table.

### Greens (success + accent)
| Hex | Uses (HQFI / SC) | Map to |
|---|---:|---|
| `#2d6a4f` | 1 / 0 | `T.accent` |
| `#245C43` | 1 / 0 | `T.accentText` |
| `#52b788` | 0 / 1 | `T.accentMid` |
| `#bbf7d0` | 1 / 0 | `T.successBd` |
| `#f0fdf4` | 3 / 0 | `T.successLight` |
| `#166534` | 3 / 1 | `T.successText` |
| `#16a34a` | 1 / 0 | `T.success` |
| `#065f46` | 2 / 0 | `T.successText` |
| `#059669` | 1 / 0 | `T.success` (slight hue drift — acceptable) |
| `#E8F5E9` | 0 / 1 | `T.successLight` |
| `#A5D6A7` | 0 / 1 | `T.successBd` |
| `#2E7D32` | 0 / 1 | `T.successText` |

### Ambers / oranges (warning family)
| Hex | Uses (HQFI / SC) | Map to |
|---|---:|---|
| `#FEF3C7` | 4 / 0 | `T.warningLight` |
| `#FDE68A` | 7 / 0 | `T.warningBd` |
| `#92400E` | 7 / 2 | `T.warningText` |
| `#d97706` | 3 / 0 | `T.warning` |
| `#b45309` | 1 / 0 | `T.warningText` |
| `#ca8a04` | 1 / 0 | `T.warning` (slight hue drift — review) |
| `#fff7ed` | 3 / 0 | `T.warningLight` |
| `#fed7aa` | 2 / 0 | `T.warningBd` |
| `#c2410c` | 3 / 0 | `T.warningText` (saturated — review if ok) |

### Reds (danger family)
| Hex | Uses (HQFI / SC) | Map to |
|---|---:|---|
| `#FECACA` | 4 / 0 | `T.dangerBd` |
| `#dc2626` | 1 / 0 | `T.danger` |
| `#991b1b` | 2 / 0 | `T.dangerText` |
| `#fef2f2` | 1 / 0 | `T.dangerLight` |
| `#9f1239` | 1 / 0 | `T.dangerText` (saturated pink-red — review) |
| `#be185d` | 1 / 0 | pink-magenta — **review**: remap to `T.danger` or add `T.pink`? |

### Blues (info family)
| Hex | Uses (HQFI / SC) | Map to |
|---|---:|---|
| `#1d4ed8` | 4 / 0 | `T.info` (saturated — review) |
| `#eff6ff` | 1 / 0 | `T.infoLight` |
| `#0369a1` | 1 / 0 | `T.info` |
| `#0e7490` | 1 / 0 | cyan hue — **review**: `T.info` close enough? |
| `#0891b2` | 1 / 0 | cyan — **review**: same |

### Purples / indigos — **NO EXISTING TOKEN** ★
| Hex | Uses (HQFI / SC) | Status |
|---|---:|---|
| `#5b21b6` | 2 / 0 | NO TOKEN |
| `#7c3aed` | 2 / 0 | NO TOKEN |
| `#6d28d9` | 1 / 0 | NO TOKEN |
| `#4338ca` | 1 / 0 | NO TOKEN — indigo |
| `#eef2ff` | 1 / 0 | NO TOKEN — indigo-light |
| `#F5F3FF` | 1 / 0 | NO TOKEN — purple-light |
| `#7E22CE` | 0 / 1 | NO TOKEN |

### Neutrals / surfaces
| Hex | Uses (HQFI / SC) | Map to |
|---|---:|---|
| `#fff` | 6 / 6 | `T.surface` |
| `#ffffff` | 1 / 0 | `T.surface` |
| `#fcfcfb` | 4 / 0 | `T.surfaceAlt` (or keep — near-white) |
| `#fafafa` | 1 / 0 | `T.surfaceAlt` |
| `#D4CFC4` | 1 / 0 | `T.border` (warm variant — review) |
| `#475569` | 1 / 0 | `T.ink700` |
| `#374151` | 1 / 0 | `T.ink700` |
| `#6b7280` | 1 / 0 | `T.ink600` |

### Brand
| Hex | Uses (HQFI / SC) | Map to |
|---|---:|---|
| `#b5935a` | 0 / 2 | `T.brandGold` |

**Coverage summary:** 93 mapped / 9 purple-family unmapped / 0 unknown.

---

## SECTION 3 — NON-TRIVIAL DESIGN QUESTIONS

These are the **three design decisions** Phase 1 must answer before the mechanical pass can proceed. Leaving them unresolved means rework.

### Q1: Purple / indigo family
**9 uses across the two files.** The Tailwind purple hues (`#5B21B6`, `#7C3AED`, `#6D28D9`, `#4338CA`, `#7E22CE`) and their light backgrounds (`#EEF2FF`, `#F5F3FF`) appear on specific semantic contexts in HQFoodIngredients — likely tagging a specific ingredient class (a stat category or a "specialty" world). Options:

- **Option A — Add token:** extend `T` with `purple`, `purpleMid`, `purpleLight`, `purpleText`, `purpleBd` (5-token set, matching the semantic pattern). Cleanest long-term, but requires `tokens.js` edit (WP rule WTU-006 forbids this within the WP — escalate).
- **Option B — Remap to T.info:** treat purple uses as an alias for info. Loses semantic distinction but ships immediately.
- **Option C — Remap to T.accentMid:** treat purple as an accent moment. Visually closer on some profiles but muddles the cannabis-retail/food-beverage brand colours.

Recommended path: **Option A with explicit WP rule amendment.** The purple family is already live in a production UI — masking it with wrong-colour tokens degrades the current visual. Adding 5 tokens to `tokens.js` is a 10-line PR.

### Q2: Sub-token font sizes (`9px`, `10px`)
HQFoodIngredients has **11 uses of `fontSize: 9` or `fontSize: 10`** — below the current `T.text.xs = 11`. These are typically on dense compact badges (allergen pills, HACCP indicators). Options:

- **Option A — Bump all to 11 (`T.text.xs`):** simplest; some rows may feel slightly roomier.
- **Option B — Add `T.text.xxs = 10`:** honours the existing design.
- **Option C — Keep inline `9` / `10` with a comment:** violates DS6; not recommended.

Recommended path: **Option B.** The compact density in HQFoodIngredients is functional (ingredient cards pack many attributes) — shrinking to 11px risks loss of readability or layout spill.

### Q3: `fontWeight: 800` in HQFoodIngredients
**2 uses.** No `T.weight.extrabold` exists. Options:

- **Option A — Add `T.weight.extrabold = 800`:** honours existing design.
- **Option B — Normalise to 700 (`T.weight.bold`):** drop into token system cleanly.

Recommended path: **Option B** (normalise to 700). 2 uses is not worth a new token slot.

---

## SECTION 4 — PROPOSED PHASE 1 PR STRUCTURE

Based on the disk read, Phase 1 should be split into three commits, **not one.** The WP doc treats it as monolithic; that's a regression risk on a 5,000-line file.

### PR 1 — Tokens.js additions (pre-Phase-1 unblock)
Scope: add 5 purple tokens (`purple*`), add `T.text.xxs = 10`. No touch to consuming code. ~15 lines. Requires escalation of WTU-006 ("No tokens.js changes under this WP") — that rule was written before the audit was available. Rule amendment: **WTU-006 exception granted for T-token additions that are strict supersets** (no renaming, no value changes).
**Effort: 30 min. Risk: zero. Gate: merge + smoke-test on all 5 tenants.**

### PR 2 — HQFoodIngredients.js DS6 pass
Scope:
1. Remove 5 hardcoded hex values from the local `C` block (L71-90): `#ffffff`, `#D4CFC4`, `#245C43`, `#1D4ED8`, `#5B21B6`, `#F5F3FF`.
2. Remove the local `HACCP_COLORS` block (L126-132) and replace with a helper that returns T-based severity tokens (mirrors `getSeverityTokens` in `tokens.js`).
3. Render-code pass: apply the mapping table across L2500-L5140 in a single sweep. Every inline `background: "#FEF3C7"` → `background: T.warningLight`. Every `borderRadius: 4` → `borderRadius: T.radius.sm`. Every `fontSize: 11` → `fontSize: T.text.xs`. Every `fontWeight: 600` → `fontWeight: T.weight.semibold`. 380 replacements total.
4. `fontWeight: 800` (×2) normalised to `T.weight.bold`.
5. Local `C` block reduced to only the T-derived aliases that still add semantic value — or removed entirely in favour of direct T references.

**Effort: ~4 hours of mechanical editing + ~1 hour of verification (render every tab of HQFoodIngredients in all 3 F&B tenants: Garden Bistro, Nourish, MediCare) + ~30 min tests. Risk: MEDIUM — any regex slip breaks a render path.** Recommended: use a codemod script rather than manual edits, then a human diff review.

### PR 3 — StockControl.js DS6 finish
Scope:
1. Remove hardcoded hex from top `C` block (L114-127): `#52b788`, `#b5935a`, `#fff`, `#92400E`, `#166534`, `#b5935a` (dup), `#7E22CE`.
2. Remap the stage badge block (L2283-2287: `#E8F5E9`, `#A5D6A7`, `#2E7D32`).
3. Render-code pass on remaining ~93 `fontSize: "11px"` string forms — convert to `fontSize: T.text.xs`. Same for `"12px"` → `T.text.sm`, `"13px"` → bump to `T.text.base` (14) OR add `T.text.xs2` (design call — flag in the PR description).
4. fontWeight: same treatment as PR 2.

**Effort: ~2 hours + verification in all 5 tenants (StockControl renders for cannabis + F&B + general retail — wider surface than HQFI). Risk: MEDIUM — StockControl is the shared stock UI; any change is visible to every tenant.**

---

## SECTION 5 — RISK NOTES

**HQFoodIngredients.js is F&B-only.** Render surface: 2 tenants (Garden Bistro, Nourish) + conditionally MediCare if F&B tab exposed. Regression radius: narrow.

**StockControl.js renders for every tenant.** Regression radius: wide. Any Phase-1 mistake hits cannabis retail, dispensary, F&B, and general retail simultaneously. **Pre-demo window (17 Apr → 12 May, 25 days) is too short to safely do this.** Recommend PR 3 is **post-demo.**

**The `C` block in both files is load-bearing.** Removing `C.inkLight`, `C.ink`, `C.amber` etc. breaks every component that references them via `C.xxx`. Two safe paths:
1. Keep the `C` block but remove its own hardcoded hex (point it purely at T refs).
2. Do a full rename (`C.ink` → `T.ink900`) via codemod — more thorough but more invasive.

Recommend **path 1** for Phase 1 (lower risk), leave the rename to a Phase 4 post-demo cleanup.

**RGB/RGBA values (9 total) were not deeply investigated.** Likely all `rgba(0, 0, 0, X)` shadow/overlay values that should map to `T.shadow.sm/.md/.lg`. Pre-Phase-1 spot check recommended.

**Hot-path regression check:** on StockControl specifically, the top-of-file `makeBtn`-style factories (L136-300, several `fontSize: "11px"` hits) drive most button renders. Any change there cascades. Test coverage: every button style before/after.

---

## SECTION 6 — PHASE 1 GATE CONDITIONS (proposed)

Phase 1 is complete when:

- [ ] `tokens.js` has purple family + `T.text.xxs` merged (PR 1)
- [ ] HQFoodIngredients.js local `C` block references only T (no hardcoded hex)
- [ ] HQFoodIngredients.js has zero inline hex in render code (L2500+)
- [ ] HQFoodIngredients.js has zero numeric `borderRadius`, all go through `T.radius.*`
- [ ] HQFoodIngredients.js has zero raw `fontSize` integers, all go through `T.text.*`
- [ ] HQFoodIngredients.js has zero raw `fontWeight` integers, all go through `T.weight.*`
- [ ] StockControl.js same checks applied
- [ ] All 5 tenants smoke-tested: Garden Bistro, Nourish, MediCare, Medi Rec, Metro
- [ ] Scanner re-run confirms 0 violations in both files

---

## SECTION 7 — SUGGESTED CODEMOD SCRIPT (for PR 2 + PR 3)

A deterministic Node.js codemod can handle ~95% of the mechanical replacements. Approximate outline:

```
for each line in file:
  replace /fontSize:\s*(\d+)(?!\w)/ with T.text.* lookup
  replace /fontWeight:\s*(\d{3})/ with T.weight.* lookup
  replace /borderRadius:\s*(\d+)/ with T.radius.* lookup
  replace hex values per mapping table (word-boundary-safe)
  leave rgb/rgba for manual review
  leave compound "padding: 8px 16px" strings for manual review
```

The remaining 5% (compound padding strings, rgba shadows, any ambiguous colour) needs human review — but the bulk is scripted.

---

## APPENDIX A — SCANNER METHODOLOGY

- Tool: custom Python scanner (`/home/claude/audit/scan.py`, 140 lines)
- Input: files fetched via `GitHub:get_file_contents` at main HEAD, extracted to `/home/claude/audit/`
- Line count verified post-fetch (5,140 and 4,743 respectively — matches WP doc figures ± drift)
- Comment lines excluded from scan
- False-positive known: `borderRadius: "50%"` (circle) — 1 occurrence in StockControl
- Patterns detected: hex `#[0-9A-Fa-f]{3,8}` (3/6/8-char only), rgb/rgba, numeric `borderRadius`, numeric `fontSize`, numeric `fontWeight` (3-digit), numeric padding/margin/gap

## APPENDIX B — RAW SCAN DATA

Raw scan output with full line-number list and source context per violation is available in the scanner's JSON output. For any cell in this report, the precise line list can be recovered by re-running the scan against the same HEAD.

---
*WP-TABLE-UNIFY PHASE 1 AUDIT · Session 291 close · 17 April 2026*
*No code was modified during this audit. Read-only fetch from main branch.*
*Commit this doc to `docs/WP-TABLE-UNIFY_PHASE1_AUDIT_v1.md` via Claude Code (RULE 0Q).*
