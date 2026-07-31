# Scorer

`score.ts` is the same zero-dependency mechanical scorer that ships inside
the commercial eval packs — CI-tested upstream, runs on Node 18+ via
`npx tsx`.

## Answers-file contract

A JSON array with one entry per (task, attempt):

```json
[
  { "task_id": "ev-rg-2026-0001", "attempt": 1, "text": "<the system's full answer>" },
  { "task_id": "ev-rg-2026-0001", "attempt": 2, "text": "..." }
]
```

Run each task k times (k=3 recommended), presenting `prompt.system` +
`prompt.user` verbatim.

## Run

```bash
npx tsx bench/score.ts data/planning-benchmark-v2.jsonl answers.json --k 3 --out scoreboard.json
```

Reports pass@1, pass^k, per-family pass@1, and the Stale Figure Rate with
its denominator (attempts on forbidden-defining tasks). Unanswered
(task, attempt) cells score as failures, loudly. Records the surrounding
text for every forbidden-figure hit so a human can review edge cases (e.g.
a prior-year value correctly labeled as historical — not a hit under the
pass definition; see METHODOLOGY.md). Boolean structured fields are
surfaced under `needs_review` rather than silently guessed.
