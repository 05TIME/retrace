import { parseOverrides, replay, runTriage, whatIf } from './core';
import { fetchCandidates, fetchIssue } from './storage/jira';
import { loadTrace, saveTrace } from './storage/traces';

const ISSUE_KEY = /^[A-Z][A-Z0-9_]+-\d+$/;

function checkKey(issueKey: unknown): string {
  if (typeof issueKey !== 'string' || !ISSUE_KEY.test(issueKey)) throw new Error('A valid Jira issue key is required');
  return issueKey;
}

export async function triage(issueKey: unknown, seed?: number) {
  const k = checkKey(issueKey);
  const input = { issue: await fetchIssue(k), candidates: await fetchCandidates(k), seed };
  const trace = runTriage(input, () => new Date().toISOString());
  await saveTrace({ trace, input: { ...input, seed: trace.seed } });
  return trace;
}

export async function replayLatest(issueKey: unknown) {
  const stored = await loadTrace(checkKey(issueKey));
  if (!stored) return { found: false as const };
  const r = replay(stored.trace, stored.input);
  return { found: true as const, ok: r.ok, divergedAt: r.divergedAt, reason: r.reason, rootHash: stored.trace.rootHash };
}

export async function whatIfLatest(issueKey: unknown, overrides: unknown) {
  const stored = await loadTrace(checkKey(issueKey));
  if (!stored) return { found: false as const };
  const { alt, diff } = whatIf(stored.trace, stored.input, parseOverrides(overrides));
  return { found: true as const, original: stored.trace.decision, alternative: alt.decision, diff, altRootHash: alt.rootHash };
}

export async function latest(issueKey: unknown) {
  return (await loadTrace(checkKey(issueKey)))?.trace ?? null;
}
