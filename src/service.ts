import { buildOverrides, replay, runTriage, traceStatus, whatIf, type WhatIfControls } from './core';
import { fetchCandidates, fetchIssue, searchIssues } from './storage/jira';
import type { FindIssuesParams } from './core';
import { loadTrace, saveTrace, type StoredTrace } from './storage/traces';

const ISSUE_KEY = /^[A-Z][A-Z0-9_]+-\d+$/;
const LEGACY_NOTE = 'The stored trace was recorded by an older Retrace engine. Run "Triage + record" to create a fresh one.';

function checkKey(issueKey: unknown): string {
  if (typeof issueKey !== 'string' || !ISSUE_KEY.test(issueKey)) throw new Error('A valid Jira issue key is required');
  return issueKey;
}

/** Loads the stored trace, classifying anything from an older engine as legacy instead of failing. */
async function loadCurrent(k: string): Promise<{ stored: StoredTrace | null; legacy: boolean }> {
  let raw: unknown;
  try {
    raw = await loadTrace(k);
  } catch {
    return { stored: null, legacy: true };
  }
  const status = traceStatus((raw as StoredTrace | undefined)?.trace ?? raw);
  if (status === 'current' && (raw as StoredTrace).input) return { stored: raw as StoredTrace, legacy: false };
  return { stored: null, legacy: status !== 'none' };
}

export async function triage(issueKey: unknown, seed?: number) {
  const k = checkKey(issueKey);
  const previous = await loadCurrent(k);
  const input = { issue: await fetchIssue(k), candidates: await fetchCandidates(k), seed };
  const trace = runTriage(input, () => new Date().toISOString());
  await saveTrace({ trace, input: { ...input, seed: trace.seed } });
  const previousRootHash = previous.stored?.trace.rootHash ?? null;
  return {
    ...trace,
    issueKeyUsed: k,
    previousRootHash,
    unchanged: previousRootHash === trace.rootHash,
    replacedLegacy: previous.legacy,
  };
}

export async function replayLatest(issueKey: unknown) {
  const k = checkKey(issueKey);
  const { stored, legacy } = await loadCurrent(k);
  if (!stored) return { found: false as const, legacy, note: legacy ? LEGACY_NOTE : 'No trace recorded yet; triage first.' };
  const r = replay(stored.trace, stored.input);
  return {
    found: true as const,
    issueKey: k,
    ok: r.ok,
    verdict: r.ok ? 'verified' : 'mismatch',
    divergedAt: r.divergedAt,
    reason: r.reason,
    rootHash: stored.trace.rootHash,
    rerunRootHash: r.rerun.rootHash,
    steps: stored.trace.steps.length,
  };
}

export async function whatIfLatest(issueKey: unknown, controls: WhatIfControls) {
  const k = checkKey(issueKey);
  const { stored, legacy } = await loadCurrent(k);
  if (!stored) return { found: false as const, legacy, note: legacy ? LEGACY_NOTE : 'No trace recorded yet; triage first.' };
  const overrides = buildOverrides(stored.input.issue, controls);
  const { alt, diff } = whatIf(stored.trace, stored.input, overrides);
  return {
    found: true as const,
    issueKey: k,
    applied: overrides,
    original: stored.trace.decision,
    alternative: alt.decision,
    diff,
    rootHash: stored.trace.rootHash,
    altRootHash: alt.rootHash,
  };
}

export async function latest(issueKey: unknown) {
  const { stored, legacy } = await loadCurrent(checkKey(issueKey));
  return { trace: stored?.trace ?? null, legacy };
}

export async function findIssues(p: FindIssuesParams) {
  const r = await searchIssues(p);
  return { count: r.issues.length, jql: r.jql, issues: r.issues };
}
