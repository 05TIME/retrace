import { CURRENT_ENGINE } from './guard';
import { canonicalize } from './canonical';
import { GENESIS, hashValue, sha256 } from './hash';
import { createRng, seedFromString } from './rng';
import { Candidate, IssueInput, Priority, detectLabels, isPriority, pickAssignee, priorityFor } from './triage';

export const ENGINE_VERSION = CURRENT_ENGINE;

export interface TraceStep {
  index: number;
  name: string;
  input: unknown;
  output: unknown;
  prevHash: string;
  hash: string;
}

export interface Decision {
  priority: string;
  labels: string[];
  assignee: string | null;
  assigneeName?: string | null;
  reasons?: string[];
}

export interface Trace {
  version: string;
  issueKey: string;
  seed: number;
  recordedAt: string;
  inputHash: string;
  steps: TraceStep[];
  decision: Decision;
  rootHash: string;
}

export interface TriageInput {
  issue: IssueInput;
  candidates: Candidate[];
  seed?: number;
  /** What-if only: pin the priority instead of scoring it. Recorded in the trace. */
  forcePriority?: Priority;
}

function stepHash(prevHash: string, index: number, name: string, input: unknown, output: unknown): string {
  return sha256(prevHash + '|' + canonicalize({ index, name, input, output }));
}

/** Runs the deterministic triage pipeline. `now` is injected so the clock never affects hashes. */
export function runTriage(input: TriageInput, now: () => string = () => new Date(0).toISOString()): Trace {
  // Normalize order-insensitive inputs so equivalent inputs always hash identically.
  input = {
    ...input,
    issue: { ...input.issue, labels: [...input.issue.labels].sort(), components: [...input.issue.components].sort() },
    candidates: [...input.candidates].sort((a, b) => a.accountId.localeCompare(b.accountId)),
  };
  const seed = input.seed ?? seedFromString(input.issue.key);
  const rng = createRng(seed);
  const steps: TraceStep[] = [];
  let prev = GENESIS;
  const record = (name: string, stepIn: unknown, out: unknown) => {
    const hash = stepHash(prev, steps.length, name, stepIn, out);
    steps.push({ index: steps.length, name, input: stepIn, output: out, prevHash: prev, hash });
    prev = hash;
    return out;
  };

  const det = record('detect-labels', { issue: input.issue }, detectLabels(input.issue)) as ReturnType<typeof detectLabels>;
  const forced = input.forcePriority;
  const priority = record(
    'score-priority',
    forced ? { score: det.score, forcePriority: forced } : { score: det.score },
    forced
      ? { priority: forced, reason: `forced to ${forced} (what-if)` }
      : { priority: priorityFor(det.score), reason: `score ${det.score} maps to ${priorityFor(det.score)}` },
  ) as { priority: string; reason: string };
  const assignee = record(
    'pick-assignee',
    { labels: det.labels, candidates: input.candidates, rngState: rng.state() },
    pickAssignee(det.labels, input.issue, input.candidates, rng),
  ) as { accountId: string | null; displayName: string | null; reason: string };

  const decision: Decision = {
    priority: priority.priority,
    labels: det.labels,
    assignee: assignee.accountId,
    assigneeName: assignee.displayName,
    reasons: [...det.reasons, `Priority: ${priority.reason}.`, `Assignee: ${assignee.reason}.`],
  };
  record('decision', null, decision);

  return {
    version: ENGINE_VERSION,
    issueKey: input.issue.key,
    seed,
    recordedAt: now(),
    inputHash: hashValue({ issue: input.issue, candidates: input.candidates, seed }),
    steps,
    decision,
    rootHash: prev,
  };
}

export interface VerifyResult {
  ok: boolean;
  divergedAt: number | null;
  reason: string | null;
}

/** Checks the hash chain is internally consistent (tamper detection). */
export function verifyChain(trace: Trace): VerifyResult {
  let prev = GENESIS;
  for (const s of trace.steps) {
    if (s.prevHash !== prev) return { ok: false, divergedAt: s.index, reason: 'prevHash mismatch' };
    if (stepHash(prev, s.index, s.name, s.input, s.output) !== s.hash) {
      return { ok: false, divergedAt: s.index, reason: 'step hash mismatch' };
    }
    prev = s.hash;
  }
  if (prev !== trace.rootHash) return { ok: false, divergedAt: trace.steps.length, reason: 'root hash mismatch' };
  return { ok: true, divergedAt: null, reason: null };
}

/** Re-executes from the recorded inputs and compares every step. */
export function replay(trace: Trace, input: TriageInput): VerifyResult & { rerun: Trace } {
  const chain = verifyChain(trace);
  const rerun = runTriage({ ...input, seed: trace.seed }, () => trace.recordedAt);
  if (!chain.ok) return { ...chain, rerun };
  for (let i = 0; i < Math.max(trace.steps.length, rerun.steps.length); i++) {
    if (trace.steps[i]?.hash !== rerun.steps[i]?.hash) {
      return { ok: false, divergedAt: i, reason: `step ${trace.steps[i]?.name ?? i} differs on rerun`, rerun };
    }
  }
  return { ok: true, divergedAt: null, reason: null, rerun };
}

export interface FieldDiff {
  field: keyof Decision;
  before: unknown;
  after: unknown;
}

export function diffDecisions(a: Decision, b: Decision): FieldDiff[] {
  const out: FieldDiff[] = [];
  for (const field of ['priority', 'labels', 'assignee'] as const) {
    if (canonicalize(a[field]) !== canonicalize(b[field])) out.push({ field, before: a[field], after: b[field] });
  }
  return out;
}

export type IssueOverrides = Partial<Omit<IssueInput, 'key'>> & { forcePriority?: Priority };

const OVERRIDABLE = ['summary', 'description', 'labels', 'components', 'issueType', 'forcePriority'] as const;

export function parseOverrides(raw: unknown): IssueOverrides {
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new TypeError('overrides must be a JSON object');
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (!(OVERRIDABLE as readonly string[]).includes(k)) throw new TypeError(`field not overridable: ${k}`);
    const isList = k === 'labels' || k === 'components';
    if (k === 'forcePriority') {
      if (!isPriority(v)) throw new TypeError('forcePriority must be one of Highest, High, Medium, Low, Lowest');
      out[k] = v;
      continue;
    }
    if (isList ? !(Array.isArray(v) && v.every((x) => typeof x === 'string')) : typeof v !== 'string') {
      throw new TypeError(`invalid type for ${k}`);
    }
    out[k] = v;
  }
  return out as IssueOverrides;
}

/** Counterfactual rerun with the same seed, so only the overridden inputs can change the outcome. */
export function whatIf(trace: Trace, input: TriageInput, overrides: IssueOverrides) {
  const { forcePriority, ...issueOverrides } = overrides;
  const alt = runTriage(
    { issue: { ...input.issue, ...issueOverrides }, candidates: input.candidates, seed: trace.seed, forcePriority },
    () => trace.recordedAt,
  );
  return { alt, diff: diffDecisions(trace.decision, alt.decision) };
}

export { isTrace, traceStatus, CURRENT_ENGINE } from './guard';

/** Friendly what-if controls: add/remove labels and optionally force a priority, merged with raw JSON overrides. */
export interface WhatIfControls {
  addLabels?: string[] | string;
  removeLabels?: string[] | string;
  forcePriority?: string;
  overrides?: unknown;
}

const splitList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(',') : [];

export function buildOverrides(base: IssueInput, c: WhatIfControls): IssueOverrides {
  const raw = c.overrides === undefined || c.overrides === '' ? {} : parseOverrides(c.overrides);
  const add = splitList(c.addLabels).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const remove = new Set(splitList(c.removeLabels).map((s) => s.trim().toLowerCase()).filter(Boolean));
  const out: IssueOverrides = { ...raw };
  if (add.length || remove.size) {
    const start = raw.labels ?? base.labels;
    out.labels = [...new Set([...start.map((l) => l.toLowerCase()), ...add])].filter((l) => !remove.has(l)).sort();
  }
  if (c.forcePriority !== undefined && c.forcePriority !== '') {
    if (!isPriority(c.forcePriority)) throw new TypeError('forcePriority must be one of Highest, High, Medium, Low, Lowest');
    out.forcePriority = c.forcePriority;
  }
  return out;
}
