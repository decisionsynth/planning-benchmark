# Planning Benchmark

**Can your AI cite this year's tax figures?** An open evaluation for AI
financial-advice systems with answer keys built from primary-source-verified
U.S. regulatory figure tables — including the enumerated wrong-but-plausible
stale values (*forbidden figures*) with reason codes, so "how stale is this
model" is a scored number, not an anecdote.

Headline from the pre-registered pilot of record (40 held-out tasks, 4
systems from 3 labs, k=3): **29% of figure-bearing attempts (86/300) cited a
stale or fabricated regulatory figure as current.** Per-system Stale Figure
Rates ranged 7%–63%, and the errors repeated across attempts — staleness is
a systematic property of a frozen model, not sampling noise.

## Why this exists

U.S. planning figures — contribution limits, phase-out ranges, surcharge
tiers, exclusion amounts — roll every January. A deployed language model's
parameters are frozen at its training cutoff. Existing finance benchmarks
(FinanceBench et al.) test document QA; none measure *figure currency* — the
failure mode where an answer is fluent, cited, and numerically wrong in a
way only someone who already knows the current figure would catch.

## What's in the box

```
data/planning-benchmark-v2.jsonl   50 open-split tasks WITH answer keys (current)
data/planning-benchmark-v1.jsonl   14 superseded v1 tasks (citation continuity)
data/LICENSE                       eval-data license (free for evaluation; NO training use)
bench/score.ts                     zero-dependency mechanical scorer (pass@1, pass^k, SFR)
results/pilot-of-record.md         the published scoreboard: bare + Rule Sets contrast tables
METHODOLOGY.md                     protocol, pass definition, SFR formula, caveats
LICENSE                            Apache-2.0 (harness code)
```

Each v2 task carries `prompt.system` + `prompt.user`, and an `answer_key`
with `required_figures` (value, unit, establishing source document — e.g.
IRS Notice 2025-67) and `forbidden_figures` (stale/superseded/derived values
with reason codes: `prior_year_value`, `superseded`, `derived_not_published`,
`fabricated_forward_figure`, …). Scoring is fully mechanical — no LLM judge.

## Quickstart

```bash
npm install
# 1. Present each task's prompt.system + prompt.user to your system, k=3 attempts.
# 2. Collect answers as JSON: [{"task_id": "...", "attempt": 1, "text": "..."}]
# 3. Score:
npx tsx bench/score.ts data/planning-benchmark-v2.jsonl answers.json --k 3 --out scoreboard.json
```

Report pass@1, pass^k, and the **Stale Figure Rate** (stale-hit attempts ÷
figure-bearing attempts) **with the denominator, k, and vintage**. A rate
without those three is an anecdote with a percent sign.

Blind mode via the live API:
`https://www.wealthschema.com/api/benchmark/v2?withhold_answers=true`

## Scoreboard

Maintainer-run, published with the full pre-registered protocol and the
substitution log at <https://www.wealthschema.com/benchmark>. Summary tables
in [`results/pilot-of-record.md`](results/pilot-of-record.md) — including
the Rule Sets contrast run: the same systems that produced 65 stale figures
in 225 bare attempts produced **zero** in 225 attempts with a live figures
feed in context.

## What's deliberately held out

This open split is 50 of a 471-task corpus. The adversarial
categorical-flip family, all decision-recall tasks, and a held-out reserve
(including every task of the pilot of record) are never published — that is
what keeps the scoreboard re-runnable and third-party comparisons
meaningful. The commercial families ship as one-time eval packs:
<https://www.wealthschema.com/ai-eval-sets>. The open split stays free,
forever.

## License and training use

Harness code: Apache-2.0. Task data: free for evaluation, benchmarking, and
research with attribution — **no training use** (`training_use_permitted:
false` on every record; see [`data/LICENSE`](data/LICENSE)). Training on
evaluation data destroys its value for everyone it is compared against.

All scenarios are synthetic; the regulatory figures are real, cited to
primary government documents, and are not tax, legal, or financial advice.
Each answer key is correct for its stated tax-year `vintage`; figures roll
every January and a new vintage ships each year.

Related: [DecisionSynth Bench](https://github.com/decisionsynth/decisionsynth-bench)
— decision-relevant memory evaluation over the same synthetic-household
corpus, from the same team.

Cite via [`CITATION.cff`](CITATION.cff). Dataset mirror:
<https://huggingface.co/datasets/wealthschema/planning-benchmark> ·
Questions: support@capstera.com
