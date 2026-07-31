/**
 * AI Eval Sets — mechanical scorer.
 *
 * Ships inside every eval-pack ZIP (copied verbatim by
 * scripts/package-eval-packs.ts). Zero dependencies; runs anywhere with
 * Node 18+ via `npx tsx score.ts` or after a plain `tsc` compile.
 *
 * Usage:
 *   npx tsx score.ts <tasks.jsonl> <answers.json> [--k 3] [--out scoreboard.json]
 *
 * answers.json is a JSON array of attempts:
 *   [{ "task_id": "ev-rg-2026-0001", "attempt": 1, "text": "<the system's full answer>" }, ...]
 * Run each task k times (k=3 recommended) with attempt = 1..k.
 *
 * Scoring is mechanical, mirroring the pilot-of-record contract:
 *   - every answer_key.required_figures[].value must appear in the text
 *     (exact numeric match; $ signs, thousands separators, and trailing
 *     decimals are normalized);
 *   - no answer_key.forbidden_figures[].value may appear (each hit is
 *     recorded with its reason code and the surrounding text so a human
 *     can review edge cases, e.g. a prior-year value correctly labeled
 *     as prior-year);
 *   - answer_key.expected_numeric must appear when set;
 *   - required_text / forbidden_text are case-insensitive substring
 *     checks (ANY listed alternative satisfies/violates);
 *   - string values in expected_structured are substring-checked;
 *     boolean/ambiguous structured fields are surfaced for human review
 *     rather than silently guessed.
 *
 * Reported metrics: pass@1, pass^k, per-family pass@1, and the Stale
 * Figure Rate (SFR) — attempts containing >=1 forbidden-figure hit over
 * attempts on forbidden-defining tasks. Always report SFR with its
 * denominator, k, and the pack's tax-year vintage.
 */

import fs from "fs";

interface Figure { key?: string; value: number; unit?: string; reason?: string; vintage?: number }
interface TextAssertion { assertion_id: string; match_any: string[] }
interface EvalTask {
  task_id: string;
  family: string;
  difficulty: string;
  vintage: number;
  answer_key: {
    answer_type: string;
    expected_numeric?: number;
    expected_structured?: Record<string, string | number | boolean>;
    required_figures: Figure[];
    forbidden_figures: Figure[];
    required_text: TextAssertion[];
    forbidden_text: TextAssertion[];
  };
}
interface Attempt { task_id: string; attempt: number; text: string }

interface AttemptScore {
  task_id: string;
  attempt: number;
  family: string;
  pass: boolean;
  stale_hit: boolean;
  missing_required: number[];
  forbidden_hits: { value: number; reason?: string; snippet: string }[];
  failed_assertions: string[];
  needs_review: string[];
}

/** All textual forms a numeric value plausibly takes in prose. */
function numberPattern(value: number): RegExp {
  const abs = Math.abs(value);
  const fixed = Number.isInteger(abs) ? String(abs) : String(abs);
  const grouped = abs.toLocaleString("en-US", { maximumFractionDigits: 6 });
  const alts = [...new Set([fixed, grouped])].map((s) =>
    s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  // No digit (or digit,digit) immediately adjacent, so 4,500 never matches
  // inside 24,500 and 24500 never matches inside 124500.
  return new RegExp(`(?<![\\d.,])\\$?\\s?(?:${alts.join("|")})(?:\\.0+)?(?![\\d,]?\\d)`, "i");
}

function findNumber(text: string, value: number): { found: boolean; index: number } {
  const m = numberPattern(value).exec(text);
  return m ? { found: true, index: m.index } : { found: false, index: -1 };
}

export function scoreAttempt(task: EvalTask, text: string): AttemptScore {
  const key = task.answer_key;
  const missing: number[] = [];
  const hits: AttemptScore["forbidden_hits"] = [];
  const failed: string[] = [];
  const review: string[] = [];

  for (const f of key.required_figures) {
    if (!findNumber(text, f.value).found) missing.push(f.value);
  }
  if (key.expected_numeric !== undefined && !findNumber(text, key.expected_numeric).found) {
    missing.push(key.expected_numeric);
  }
  for (const f of key.forbidden_figures) {
    const r = findNumber(text, f.value);
    if (r.found) {
      hits.push({
        value: f.value,
        reason: f.reason,
        snippet: text.slice(Math.max(0, r.index - 80), r.index + 120).replace(/\s+/g, " "),
      });
    }
  }
  const lower = text.toLowerCase();
  for (const a of key.required_text) {
    if (!a.match_any.some((m) => lower.includes(m.toLowerCase()))) failed.push(`missing required_text ${a.assertion_id}`);
  }
  for (const a of key.forbidden_text) {
    if (a.match_any.some((m) => lower.includes(m.toLowerCase()))) failed.push(`matched forbidden_text ${a.assertion_id}`);
  }
  for (const [k, v] of Object.entries(key.expected_structured ?? {})) {
    if (typeof v === "number") {
      if (!findNumber(text, v).found) missing.push(v);
    } else if (typeof v === "string") {
      if (!/^\d+(?:,\s*\d+)*$/.test(v)) {
        if (!lower.includes(v.toLowerCase())) failed.push(`missing expected ${k}="${v}"`);
      } else if (!v.split(/,\s*/).every((n) => findNumber(text, Number(n)).found)) {
        failed.push(`missing expected ${k}="${v}"`);
      }
    } else {
      review.push(`boolean field ${k}=${v} — verify by hand`);
    }
  }

  return {
    task_id: task.task_id,
    attempt: 0,
    family: task.family,
    pass: missing.length === 0 && hits.length === 0 && failed.length === 0,
    stale_hit: hits.length > 0,
    missing_required: missing,
    forbidden_hits: hits,
    failed_assertions: failed,
    needs_review: review,
  };
}

export function buildScoreboard(tasks: EvalTask[], attempts: Attempt[], k: number) {
  const byId = new Map(tasks.map((t) => [t.task_id, t]));
  const scores: AttemptScore[] = [];
  for (const a of attempts) {
    const task = byId.get(a.task_id);
    if (!task) {
      console.error(`[score] unknown task_id ${a.task_id} — skipped`);
      continue;
    }
    scores.push({ ...scoreAttempt(task, a.text ?? ""), attempt: a.attempt });
  }
  // Unanswered (task, attempt) cells score as failures, loudly.
  for (const t of tasks) {
    for (let i = 1; i <= k; i++) {
      if (!scores.some((s) => s.task_id === t.task_id && s.attempt === i)) {
        console.error(`[score] no answer for ${t.task_id} attempt ${i} — scored as fail`);
        scores.push({
          task_id: t.task_id, attempt: i, family: t.family, pass: false, stale_hit: false,
          missing_required: [], forbidden_hits: [], failed_assertions: ["unanswered"], needs_review: [],
        });
      }
    }
  }

  const first = scores.filter((s) => s.attempt === 1);
  const passAt1 = first.filter((s) => s.pass).length / Math.max(1, first.length);
  const passK =
    tasks.filter((t) => {
      const mine = scores.filter((s) => s.task_id === t.task_id);
      return mine.length >= k && mine.every((s) => s.pass);
    }).length / Math.max(1, tasks.length);

  const forbiddenDefining = new Set(
    tasks.filter((t) => t.answer_key.forbidden_figures.length > 0).map((t) => t.task_id),
  );
  const figureBearing = scores.filter((s) => forbiddenDefining.has(s.task_id));
  const staleHits = figureBearing.filter((s) => s.stale_hit).length;

  const families = [...new Set(tasks.map((t) => t.family))].sort();
  const perFamily = Object.fromEntries(
    families.map((f) => {
      const mine = first.filter((s) => s.family === f);
      return [f, mine.length ? mine.filter((s) => s.pass).length / mine.length : null];
    }),
  );

  return {
    k,
    task_count: tasks.length,
    attempt_count: scores.length,
    pass_at_1: Number(passAt1.toFixed(3)),
    [`pass_pow_${k}`]: Number(passK.toFixed(3)),
    pass_at_1_by_family: perFamily,
    stale_figure_rate: figureBearing.length
      ? Number((staleHits / figureBearing.length).toFixed(3))
      : null,
    stale_figure_rate_denominator: figureBearing.length,
    stale_hits: staleHits,
    needs_review: scores.filter((s) => s.needs_review.length > 0).length,
    attempts: scores,
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const kIdx = args.indexOf("--k");
  const outIdx = args.indexOf("--out");
  const k = kIdx >= 0 ? Number(args[kIdx + 1]) : 3;
  if (positional.length < 2) {
    console.error("usage: npx tsx score.ts <tasks.jsonl> <answers.json> [--k 3] [--out scoreboard.json]");
    process.exit(1);
  }
  const tasks: EvalTask[] = fs
    .readFileSync(positional[0], "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const answers: Attempt[] = JSON.parse(fs.readFileSync(positional[1], "utf-8"));
  const board = buildScoreboard(tasks, answers, k);
  const json = JSON.stringify(board, null, 2);
  if (outIdx >= 0) {
    fs.writeFileSync(args[outIdx + 1], json + "\n");
    console.error(`[score] wrote ${args[outIdx + 1]}`);
    const { attempts: _a, ...summary } = board;
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(json);
  }
}
