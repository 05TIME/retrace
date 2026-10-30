import { describe, expect, it } from 'vitest';
import { filterAssignable, mergeCandidates, pickAssignee, createRng } from '../src/core';

const mitch = { accountId: 'acc-mitch', displayName: 'Mitch Davis', accountType: 'atlassian', active: true };
const ann = { accountId: 'acc-ann', displayName: 'Ann', accountType: 'atlassian' };

describe('mergeCandidates', () => {
  it('uses the current assignee when assignable search returned nothing', () => {
    expect(mergeCandidates([], [mitch])).toEqual([{ accountId: 'acc-mitch', displayName: 'Mitch Davis', skills: [], openIssues: 0 }]);
  });
  it('dedupes, sorts, drops apps/inactive/null users', () => {
    const out = mergeCandidates([mitch, { accountId: 'bot', accountType: 'app' }], [ann, mitch, null], [{ ...ann, accountId: 'x', active: false }]);
    expect(out.map((c) => c.accountId)).toEqual(['acc-ann', 'acc-mitch']);
  });
  it('is order-independent', () => {
    expect(mergeCandidates([ann], [mitch])).toEqual(mergeCandidates([mitch], [ann]));
  });
  it('leads to a real assignee instead of "no assignable users found"', () => {
    const issue = { key: 'MOBL-57', summary: 's', description: '', labels: [], components: [], issueType: 'Bug' };
    const r = pickAssignee([], issue, mergeCandidates([], [mitch]), createRng(1));
    expect(r.displayName).toBe('Mitch Davis');
  });
});

describe('filterAssignable', () => {
  it('keeps only active atlassian accounts', () => {
    const out = filterAssignable([mitch, ann, { accountId: 'bot', accountType: 'app', active: true }, { accountId: 'c', accountType: 'customer' }, { ...mitch, accountId: 'gone', active: false }, null]);
    expect(out.map((u: any) => u.accountId)).toEqual(['acc-mitch', 'acc-ann']);
  });
  it('handles non-array bodies', () => {
    expect(filterAssignable({ errorMessages: ['x'] })).toEqual([]);
  });
  it('fresh site: assignable search alone yields candidates', () => {
    expect(mergeCandidates(filterAssignable([mitch]), [], [])).toHaveLength(1);
  });
});
