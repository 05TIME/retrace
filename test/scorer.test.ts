import { describe, expect, it } from 'vitest';
import { buildOverrides, detectLabels, runTriage, traceStatus, whatIf, type IssueInput, type TriageInput } from '../src/core';

const issue = (summary: string, description = '', issueType = 'Task', labels: string[] = []): IssueInput =>
  ({ key: 'KAN-1', summary, description, labels, components: [], issueType });
const decide = (i: IssueInput) => runTriage({ issue: i, candidates: [] }).decision;

describe('scorer', () => {
  it('ordinary tasks are Low, not Lowest', () => {
    expect(decide(issue('Add export to CSV'))).toMatchObject({ priority: 'Low', labels: [] });
  });
  it('a plain bug is Medium with a bug label', () => {
    expect(decide(issue('Save button does nothing', 'clicking it shows an error', 'Bug'))).toMatchObject({ priority: 'Medium', labels: ['bug', 'ux'] });
  });
  it('a crash is High', () => {
    expect(decide(issue('App crashes when opening settings', '', 'Bug'))).toMatchObject({ priority: 'High', labels: ['bug', 'crash'] });
  });
  it('security + outage is Highest', () => {
    expect(decide(issue('Login down, password reset leaks tokens', '', 'Bug')).priority).toBe('Highest');
  });
  it('performance issues are Medium', () => {
    expect(decide(issue('Search is slow', 'p95 latency is 4s'))).toMatchObject({ priority: 'Medium', labels: ['performance'] });
  });
  it('docs-only work stays Lowest', () => {
    expect(decide(issue('Update the README', 'documentation tweak'))).toMatchObject({ priority: 'Lowest', labels: ['docs'] });
  });
  it('urgency words raise priority', () => {
    expect(decide(issue('Search is slow for all users in production')).priority).toBe('High');
  });
  it('uses whole words, so "download" is not an outage and "author" counts as auth only via prefix', () => {
    expect(detectLabels(issue('Add download button')).labels).toEqual(['ux']);
    expect(detectLabels(issue('Authentication fails')).labels).toEqual(['bug', 'security']);
  });
  it('existing Jira labels count even without keywords', () => {
    expect(decide(issue('Review header', '', 'Task', ['security']))).toMatchObject({ priority: 'High', labels: ['security'] });
  });
  it('explains every decision in plain words', () => {
    const d = decide(issue('App crashes on login', '', 'Bug'));
    expect(d.reasons!.join(' ')).toMatch(/crash/);
    expect(d.reasons!.some((r) => r.startsWith('Priority:'))).toBe(true);
  });
});

describe('friendly what-if', () => {
  const input: TriageInput = { issue: issue('Footer typo'), candidates: [] };
  const t = runTriage(input);
  it('adds labels and shows a before/after diff', () => {
    const o = buildOverrides(input.issue, { addLabels: ['security'] });
    const { diff } = whatIf(t, input, o);
    expect(diff.find((d) => d.field === 'labels')).toMatchObject({ after: ['security', 'ux'] });
    expect(diff.find((d) => d.field === 'priority')).toMatchObject({ before: 'Low', after: 'High' });
  });
  it('accepts comma lists (from Rovo) and removes labels', () => {
    expect(buildOverrides(issue('x', '', 'Task', ['docs']), { addLabels: 'Outage, crash', removeLabels: 'docs' }).labels)
      .toEqual(['crash', 'outage']);
  });
  it('forces a priority, recorded in the trace', () => {
    const { alt, diff } = whatIf(t, input, buildOverrides(input.issue, { forcePriority: 'Highest' }));
    expect(diff).toEqual([{ field: 'priority', before: 'Low', after: 'Highest' }]);
    expect(alt.steps[1].input).toMatchObject({ forcePriority: 'Highest' });
  });
  it('rejects a bad priority and merges advanced JSON', () => {
    expect(() => buildOverrides(input.issue, { forcePriority: 'Urgent' })).toThrow();
    expect(buildOverrides(input.issue, { overrides: '{"summary":"Site down"}', forcePriority: '' })).toEqual({ summary: 'Site down' });
  });
  it('no controls means no change and the same hash', () => {
    const r = whatIf(t, input, buildOverrides(input.issue, {}));
    expect(r.diff).toEqual([]);
    expect(r.alt.rootHash).toBe(t.rootHash);
  });
});

describe('legacy traces', () => {
  it('classifies old or malformed traces as legacy instead of failing', () => {
    const t = runTriage({ issue: issue('x'), candidates: [] });
    expect(traceStatus(t)).toBe('current');
    expect(traceStatus({ ...t, version: 'retrace-core/1' })).toBe('legacy');
    expect(traceStatus({ foo: 1 })).toBe('legacy');
    expect(traceStatus(undefined)).toBe('none');
  });
});
