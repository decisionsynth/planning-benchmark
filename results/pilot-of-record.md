# Scoreboard — pilot of record + Rule Sets contrast run

Maintainer-run; canonical copy with protocol links at
<https://www.wealthschema.com/benchmark>. Numbers cite the protocol page:
<https://www.wealthschema.com/resources/methodology/planning-benchmark-pilot-of-record>

## Pilot of record (2026-07-30) — bare models, no tools

40 held-out tasks × 4 systems × k=3. pass@1 with 95% CI; pass^3 = all three
attempts correct; rg+tc restricts to the figure-bearing families; SFR =
stale hits / 75 figure-bearing attempts per system.

| System | pass@1 [95% CI] | pass^3 | rg+tc pass@1 | Stale Figure Rate | Floor pass^3 |
|---|---|---|---|---|---|
| claude-sonnet | 0.90 [0.83–0.94] | 0.85 | 0.84 | 0.07 (5/75) | 1.00 |
| gemini-3.1-pro-preview | 0.57 [0.48–0.65] | 0.42 | 0.33 | 0.17 (13/75) | 0.50 |
| deepseek-v4-pro | 0.48 [0.40–0.57] | 0.35 | 0.27 | 0.28 (21/75) | 0.40 |
| claude-haiku | 0.36 [0.28–0.45] | 0.33 | 0.11 | 0.63 (47/75) | 0.30 |

Aggregate: 29% of figure-bearing attempts (86/300) asserted a stale or
fabricated figure as current. In-context memory fidelity was saturated at
1.00 for all four systems (120 attempts, genuine distractors).

## Rule Sets contrast run (2026-07-31) — same tasks, live figures in context

25 figure-bearing tasks × k=3, feed rendered byte-identically per system.
deepseek-v4-pro not re-run (no API credential in the run environment).

| System | bare rg+tc pass@1 | bare SFR | with feed pass@1 | with feed pass^3 | with feed SFR |
|---|---|---|---|---|---|
| claude-sonnet | 0.84 | 0.07 (5/75) | 1.00 | 1.00 | 0.00 (0/75) |
| gemini-3.1-pro-preview | 0.33 | 0.17 (13/75) | 1.00 | 1.00 | 0.00 (0/75) |
| claude-haiku | 0.11 | 0.63 (47/75) | 0.96 | 0.92 | 0.00 (0/75) |

Zero stale figures in 225 with-lookup attempts vs 65 bare. The remaining
haiku failures were rules-comprehension errors made with correct figures in
hand (catch-up stacking; HSA catch-up treated as poolable) — a figures feed
makes a system current, not competent.

## Standing caveats (both runs)

Claude systems ran as session aliases (exact dated model strings not
exposed); gemini is a preview endpoint; batched task delivery (declared
deviation); single primary scorer with blind second-scorer pass on
judgement-heavy items; N=40/N=25. Substitution logs published verbatim on
the protocol page. Held-out tasks are never published or sold, so this
scoreboard remains re-runnable.
