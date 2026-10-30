import { describe, expect, it } from 'vitest';
import {
  GENESIS, canonicalize, createRng, diffDecisions, parseOverrides, priorityFor, replay, runTriage, seedFromString,
  verifyChain, whatIf, type TriageInput,
} from '../src/core';

const input: TriageInput = {
  issue: {
    key: 'DEMO-42',
    summary: 'Login page crash leaks session token',
    description: 'After auth the app returns 500 and the token shows in logs.',
    labels: [],
    components: ['backend'],
    issueType: 'Bug',
  },
  candidates: [
    { accountId: 'u-b', displayName: 'Bo', skills: ['security'], openIssues: 2 },
    { accountId: 'u-a', displayName: 'Ada', skills: ['security'], openIssues: 2 },
    { accountId: 'u-c', displayName: 'Cy', skills: ['ui'], openIssues: 0 },
  ],
};

describe('canonical JSON', () => {
  it('sorts keys recursively and is stable', () => {
    expect(canonicalize({ b: 1, a: { d: [1, 2], c: 'x' } })).toBe('{"a":{"c":"x","d":[1,2]},"b":1}');
  });
  it('drops undefined props, normalizes -0, rejects NaN', () => {
    expect(canonicalize({ a: undefined, b: -0 })).toBe('{"b":0}');
    expect(() => canonicalize(NaN)).toThrow();
    expect(() => canonicalize([undefined])).toThrow();
  });
});

describe('seeded RNG', () => {
  it('is reproducible per seed and differs across seeds', () => {
    const a = createRng(7), b = createRng(7), c = createRng(8);
    const seqA = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(seqA);
    expect(c.next()).not.toBe(seqA[0]);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('derives seeds from strings deterministically', () => {
    expect(seedFromString('DEMO-42')).toBe(seedFromString('DEMO-42'));
    expect(seedFromString('DEMO-42')).not.toBe(seedFromString('DEMO-43'));
  });
  it('rejects invalid int bounds', () => {
    expect(() => createRng(1).int(0)).toThrow();
  });
});

describe('triage pipeline', () => {
  it('produces a decision and a valid hash chain', () => {
    const t = runTriage(input);
    expect(t.decision.priority).toBe('Highest');
    expect(t.decision.labels).toEqual(['bug', 'crash', 'outage', 'security']);
    expect(t.decision.reasons?.length).toBeGreaterThan(3);
    expect(['u-a', 'u-b']).toContain(t.decision.assignee);
    expect(t.steps[0].prevHash).toBe(GENESIS);
    expect(t.steps.map((s) => s.name)).toEqual(['detect-labels', 'score-priority', 'pick-assignee', 'decision']);
    expect(verifyChain(t).ok).toBe(true);
  });
  it('is byte-identical across runs and independent of the clock', () => {
    const a = runTriage(input, () => '2026-01-01T00:00:00Z');
    const b = runTriage(input, () => '2030-06-06T00:00:00Z');
    expect(a.rootHash).toBe(b.rootHash);
    expect(canonicalize(a.steps)).toBe(canonicalize(b.steps));
  });
  it('is independent of candidate order', () => {
    const reversed = { ...input, candidates: [...input.candidates].reverse() };
    expect(runTriage(reversed).rootHash).toBe(runTriage(input).rootHash);
  });
  it('maps scores to priorities', () => {
    expect([0, 1, 2, 3, 5, 6, 8, 9].map(priorityFor)).toEqual(['Lowest', 'Low', 'Low', 'Medium', 'Medium', 'High', 'High', 'Highest']);
  });
  it('handles no candidates', () => {
    expect(runTriage({ ...input, candidates: [] }).decision.assignee).toBeNull();
  });
});

describe('replay and tamper detection', () => {
  it('replays to the same hashes', () => {
    const t = runTriage(input);
    const r = replay(t, input);
    expect(r.ok).toBe(true);
    expect(r.rerun.rootHash).toBe(t.rootHash);
  });
  it('detects a tampered step output', () => {
    const t = structuredClone(runTriage(input));
    (t.steps[1].output as any).priority = 'Low';
    const v = verifyChain(t);
    expect(v).toMatchObject({ ok: false, divergedAt: 1, reason: 'step hash mismatch' });
  });
  it('detects changed inputs on replay', () => {
    const t = runTriage(input);
    const changed = { ...input, issue: { ...input.issue, summary: 'Typo in footer' } };
    const r = replay(t, changed);
    expect(r).toMatchObject({ ok: false, divergedAt: 0 });
  });
});

describe('what-if', () => {
  it('diffs only the changed fields', () => {
    const t = runTriage(input);
    const { diff } = whatIf(t, input, { summary: 'Button layout off', description: 'css issue' });
    const fields = diff.map((d) => d.field);
    expect(fields).toContain('priority');
    expect(fields).toContain('labels');
  });
  it('returns empty diff when nothing changes', () => {
    const t = runTriage(input);
    expect(whatIf(t, input, {}).diff).toEqual([]);
    expect(diffDecisions(t.decision, t.decision)).toEqual([]);
  });
  it('validates overrides', () => {
    expect(parseOverrides('{"labels":["security"]}')).toEqual({ labels: ['security'] });
    expect(() => parseOverrides('{"key":"X-1"}')).toThrow();
    expect(() => parseOverrides('{"labels":"security"}')).toThrow();
    expect(() => parseOverrides('[1]')).toThrow();
  });
});
