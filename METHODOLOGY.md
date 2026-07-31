# Methodology

Condensed from the canonical protocol page, which controls where fuller:
<https://www.wealthschema.com/resources/methodology/planning-benchmark-pilot-of-record>

## Task construction

Tasks are deterministically template-assembled from primary-source-verified
U.S. figure tables — the current tax year's figures (each cited to the IRS
notice, revenue procedure, or agency release that establishes it, evidence
URL recorded) plus dedicated prior-year mirrors used to enumerate the
wrong-but-plausible answers. No LLM anywhere in the generation path. A fact
that fails primary-source verification cannot enter a task; the generator
refuses by construction.

Two open families:

- **Rule-grounding (rg):** ask for a current-year figure and its source.
- **Threshold/cliff (tc):** place a scenario near a statutory boundary so a
  stale table changes the categorical answer, not just a number.

Every `answer_key` enumerates `forbidden_figures` with reason codes from the
measured failure taxonomy: `prior_year_value` (a superseded published figure
asserted as current), `superseded` (repealed law cited as current — e.g. the
TCJA estate sunset repealed by OBBBA), `derived_not_published` (indexing
rule applied to a stale base instead of recalling the published value),
`fabricated_forward_figure` (an unpublished figure stated as fact), plus
`wrong_tier_or_status`, `wrong_base`, `fabricated`.

## The Stale Figure Rate (SFR)

    SFR = attempts asserting ≥1 forbidden figure as current
          ÷ figure-bearing attempts

Scored mechanically against the enumerated forbidden values — no judge
model, whose own frozen cutoff would make it an unreliable arbiter of
staleness. A prior-year value correctly labeled as historical is not a hit;
the check applies to the operative value only. Always report SFR with its
denominator, k, and tax-year vintage.

## Definition of a pass (frozen)

An attempt passes iff (a) every required figure is stated with the correct
value for the task's as-of date (exact unless a tolerance is stated), with
source attribution where demanded; (b) no forbidden figure appears as the
operative value; (c) required assertions present; (d) no forbidden
assertion present. Hedged-but-committed answers pass on the committed
value; dual uncommitted values fail. Recommended protocol: k=3 attempts per
task; report pass@1, pass^k, SFR, and floor-task pass^k.

## The pilot of record (2026-07-30)

Pre-registered before any model call: decision rule, pass definition, task
manifest, answer-key authority. 40 held-out tasks × 4 systems from 3 labs ×
k=3 = 480 attempts, all scored. Headline: 29% of figure-bearing attempts
(86/300) asserted a stale or fabricated figure; only one system passed
every floor task on all three tries; in-context memory was saturated at
1.00 for all systems. The full protocol — including the post-freeze
substitution log (a harness truncation bug that forced re-execution of an
entire arm, published rather than smoothed) and per-system tables with 95%
CIs — is on the protocol page. All 40 pilot tasks are permanently held out.

## The Rule Sets contrast run (2026-07-31)

Same 25 figure-bearing tasks, k=3, with a live cited-figures feed rendered
into context byte-identically for each system (feed-in-context rather than
tool calls, so the comparison measures figures, not tool-use skill). Result:
zero stale figures in 225 with-lookup attempts vs 65 bare; the boundary
task every bare system failed passed on every attempt. Honest counterweight,
published with it: the weakest system still failed four attempts on
rules-comprehension with the correct figures in hand — a figures feed makes
a system current, not competent. Exclusions and the output-cap substitution
are recorded in the protocol.

## Splits

open (this repo + the live API, floor/standard rg+tc only) · commercial
(adversarial flips, decision-recall — sold as eval packs) · held-out
(never published, never sold; keeps the scoreboard re-runnable). Vintages:
each tax year is a new corpus cut; answer keys are correct for their stated
`vintage` and `as_of_date`.
