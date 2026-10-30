import { canonicalize } from './canonical';
import { GENESIS, hashValue, sha256 } from './hash';
import { createRng, seedFromString } from './rng';
import { Candidate, IssueInput, detectLabels, pickAssignee, priorityFor } from './triage';

export const ENGINE_VERSION = 'retrace-core/1';

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
  const priority = record('score-priority', { score: det.score }, { priority: priorityFor(det.score) }) as { priority: string };
  const assignee = record(
    'pick-assignee',
    { labels: det.labels, candidates: input.candidates, rngState: rng.state() },
    pickAssignee(det.labels, input.issue, input.candidates, rng),
  ) as { accountId: string | null };

  const decision: Decision = { priority: priority.priority, labels: det.labels, assignee: assignee.accountId };
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

export type IssueOverrides = Partial<Omit<IssueInput, 'key'>>;

const OVERRIDABLE = ['summary', 'description', 'labels', 'components', 'issueType'] as const;

export function parseOverrides(raw: unknown): IssueOverrides {
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new TypeError('overrides must be a JSON object');
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (!(OVERRIDABLE as readonly string[]).includes(k)) throw new TypeError(`field not overridable: ${k}`);
    const isList = k === 'labels' || k === 'components';
    if (isList ? !(Array.isArray(v) && v.every((x) => typeof x === 'string')) : typeof v !== 'string') {
      throw new TypeError(`invalid type for ${k}`);
    }
    out[k] = v;
  }
  return out as IssueOverrides;
}

/** Counterfactual rerun with the same seed, so only the overridden inputs can change the outcome. */
export function whatIf(trace: Trace, input: TriageInput, overrides: IssueOverrides) {
  const alt = runTriage(
    { issue: { ...input.issue, ...overrides }, candidates: input.candidates, seed: trace.seed },
    () => trace.recordedAt,
  );
  return { alt, diff: diffDecisions(trace.decision, alt.decision) };
}
