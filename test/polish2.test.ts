import { describe, expect, it } from 'vitest';
import { buildOverrides, describeOverrides, runTriage, whatIf, type IssueInput } from '../src/core';
import { readFileSync } from 'node:fs';

const issue = (summary: string, issueType = 'Bug', labels: string[] = []): IssueInput =>
  ({ key: 'KAN-1', summary, description: '', labels, components: [], issueType });

describe('remove label suppresses text detection', () => {
  const base = issue('App crashes when opening settings');
  const input = { issue: base, candidates: [] };
  const trace = runTriage(input);

  it('removing crash drops it even though the text says crashes', () => {
    const o = buildOverrides(base, { removeLabels: 'crash' });
    expect(o.suppressLabels).toEqual(['crash']);
    const { alt, diff } = whatIf(trace, input, o);
    expect(alt.decision.labels).not.toContain('crash');
    expect(alt.decision.priority).toBe('Low');
    expect(diff.map((d) => d.field)).toContain('priority');
  });
  it('is deterministic and order-insensitive', () => {
    const a = whatIf(trace, input, buildOverrides(base, { removeLabels: 'crash,bug' })).alt.rootHash;
    const b = whatIf(trace, input, buildOverrides(base, { removeLabels: ' BUG , crash' })).alt.rootHash;
    expect(a).toBe(b);
  });
  it('normal traces keep the same hash shape (no suppress key)', () => {
    expect(trace.steps[0].input).toEqual({ issue: expect.anything() });
    expect(runTriage(input).rootHash).toBe(trace.rootHash);
  });
  it('adding and removing the same label: add wins', () => {
    expect(buildOverrides(base, { addLabels: 'crash', removeLabels: 'crash' }).suppressLabels).toEqual([]);
  });
});

describe('describeOverrides', () => {
  it('lists overrides for a no-change what-if', () => {
    const base = issue('x', 'Bug', ['security']);
    const o = buildOverrides(base, { addLabels: 'security', forcePriority: 'Highest' });
    expect(describeOverrides(o, base)).toEqual(['labels set to: security', 'forced priority: Highest']);
  });
  it('names added and removed labels', () => {
    const base = issue('x', 'Bug', ['docs']);
    expect(describeOverrides(buildOverrides(base, { addLabels: 'outage', removeLabels: 'docs' }), base))
      .toEqual(['added labels: outage', 'removed labels: docs']);
  });
});

describe('assignee and starters', () => {
  it('keeps the 2.6.0 hashed assignee reason (display wording lives in the UI)', () => {
    expect(runTriage({ issue: issue('x'), candidates: [] }).decision.reasons?.at(-1)).toBe('Assignee: no assignable users found.');
  });
  it('has exactly 3 conversation starters including a what-if', () => {
    const m = readFileSync('manifest.yml', 'utf8');
    const starters = m.split('conversationStarters:')[1].split('actions:')[0].match(/^\s+- .+$/gm) ?? [];
    expect(starters).toHaveLength(3);
    expect(starters.join()).toMatch(/What if/);
  });
});
