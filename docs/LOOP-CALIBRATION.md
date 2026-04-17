# NuAi Loop Calibration
## Measured rates from completed campaigns
## Living document — update after each campaign with new measurements
## Baseline: S293-S317 safety + financial campaign (18 April 2026)

---

## Purpose

AGENT-METHODOLOGY tells you WHAT to watch for. This doc tells you BY HOW MUCH.
Pre-investigation size estimates are not reliable in absolute terms. They are
reliable RELATIVELY if you know the typical deviation.

Use this when:
- Planning a new campaign and scoping it into sessions
- Evaluating whether a pre-investigation estimate is trustworthy
- Deciding how many sweep rounds to budget after a "done" declaration
- Setting owner expectations on session count

---

## Audit under-count magnitude

Measured from the S293-S317 safety + RLS + financial campaign. Each row is a
separate audit event with a predicted count and a measured actual count.

| Audit | Predicted | Actual | Delta | Source |
|---|---|---|---|---|
| S294 manual grep audit | 29 | 30 | +3% | WATCH-007 original caught +1 (HQDocuments:2361) |
| S297 HQDocuments sub-sweep | 3 | 4 | +33% | S297 commit 6c50eaf |
| S298 HQPurchaseOrders sub-sweep | 2 | 4 | +100% | S298 commit 0548979 (SAFETY-031/032) |
| S299 AdminProduction sub-sweep | 1 | 3 | +200% | S299 commit 9d2b9bc (SAFETY-033/034) |
| S301 script run vs manual grep | ~40 | 62 raw → 24 true | +55% (script) | S301 extended audit_tenant_isolation.py |
| S303 HQProduction sub-sweep | 4 | 8 | +100% | S303 commit 37cc3d3 (SAFETY-066-069) |
| S314 RLS Bucket A (CRITICAL) | 6 | 29 across 4 rounds | +383% | S314.1 (10) + S314.2a (10) + S314.2c (1) + S314.4 (8) |
| S314.3a HIGH with_check | 37 | 83 | +124% | Live DB query split into 3 tiers |
| S314.3b HR cluster | 32 | 24 | **-25%** | Over-estimate. Only over-estimate in campaign |
| S314.3c HQ bypass with_check | 57 | 65 | +14% | Mechanical, close to predicted |
| S316.5b.2 WP triage | 32 correct | 26 correct / 6 wrong | -19% accuracy | 81% first-pass; all 6 errors in under-count direction |
| S317 FIN-002 hardcode sites | 4 | 5 (+1 bug) | +25% | Register missed L332 readonly input and calendar-year bug |
| S319 GAP-002 register scope | "new table required" (L) | wiring (S-M) | -50% (over-estimate) | Register framed GAP-002 as infrastructure; disk showed column existed. Rare over-estimate case |

**Median deviation:** +33% (under-count)
**Over-estimate cases:** 2 of 13 (S314.3b, S319)
**Zero-deviation cases:** 0 of 13
**Direction bias:** strongly toward under-count (11 of 13)

---

## Recommended scope cushions

Derived from the measured rates above. Apply to any pre-investigation size
estimate before committing to a session plan.

| Work type | Cushion | Rationale |
|---|---|---|
| Manual grep audit (new file) | +30% | Median, mild skew toward more |
| Script re-run on changed code | +50% | Larger deviation observed |
| RLS policy audit | +100% | Matcher is coarser, misses more |
| HR / batch-fix work | -10% to +20% | Uniform changes; predicted count is nearly right |
| WP / doc status claims | +20% | Doc drift, same direction as code findings |
| Financial findings | +25% | Register describes surface bug; deeper root often present |

---

## Sweep discipline

For code-level safety/policy findings, budget for ≥2 post-fix sweeps on the
same pattern after the "done" declaration. Expected yield per sweep:

- First sweep after initial fix: 1–3 additional findings (~80% probability)
- Second sweep: 0–1 additional findings (~40% probability)
- Third sweep: 0 findings expected; run only if prior sweep found something

Tier 2C's Bucket A went 4 rounds. That's the observed upper bound. If any
category goes 4 rounds, declare "done" only after the 5th sweep returns zero.

---

## Triage accuracy (WP doc status)

First-pass classification accuracy when reading doc headers without code
verification: **81%** (26 of 32 correct on S316.5b.1 triage).

Error direction: 100% of errors under-classified (SCOPED read as SCOPED when
actually SHIPPED, etc.). Zero errors over-classified.

**Recommended practice:** any "SCOPED" or "READY TO BUILD" WP claim should be
verified by code grep before being treated as pending work. The 19% chance it's
already shipped is too high to skip verification.

---

## Planner / executor split cost and benefit

Three sessions tested the split (S316 integrated, S317 split, S316.5b.* split):

- Planning cost: 1 extra turn per finding (Claude.ai scopes, produces spec)
- Verification benefit: catches register scope gaps before code lands

S316 integrated session: 1 finding, 1 fix, landed clean (FIN-001).
S317 split session: 4 findings, 3 fixes (FIN-002/003/006 + HQTenants calendar-
year bug). The calendar-year bug was **not in the register.** The spec caught
it during disk grounding and fixed it in the same commit as FIN-002. An
integrated session would likely have closed "FIN-002 fixed" and left the bug
live.

**Threshold for using split:** any finding larger than a one-liner, or any
finding whose register description sounds like it might hide deeper scope.

---

## How to update this doc

After each campaign:

1. Add a row to the audit-undercount table for any new measured delta.
2. Recompute the median deviation.
3. Update scope cushions if the median has moved >10%.
4. Note any new failure mode that invalidates a prior cushion.

Do NOT delete old rows. The campaign history is the calibration; shrinking it
shrinks the confidence.

---

*LOOP-CALIBRATION.md · NuAi · Added S318 Capstone-003 · Living document*
*Update after each campaign. Rows never deleted.*
