import { describe, expect, it } from 'vitest';
import { DEFAULT_WINDOW, buildFindJql, clampMax, escapeJqlString, mapSearchResult } from '../src/core';

describe('buildFindJql', () => {
  it('is always bounded', () => {
    expect(buildFindJql()).toBe(`${DEFAULT_WINDOW} ORDER BY created DESC`);
  });
  it('filters by project and text', () => {
    expect(buildFindJql({ project: 'mobl', text: 'login "crash"' }))
      .toBe('project = MOBL AND text ~ "login \\"crash\\"" ORDER BY created DESC');
  });
  it('rejects JQL injection through the project key', () => {
    expect(() => buildFindJql({ project: 'KAN OR 1=1' })).toThrow();
  });
  it('escapes backslashes and newlines', () => {
    expect(escapeJqlString('a\\b\nc')).toBe('a\\\\b c');
  });
});

describe('clampMax / mapSearchResult', () => {
  it('clamps', () => {
    expect([clampMax(undefined), clampMax(0), clampMax(99), clampMax('5')]).toEqual([10, 1, 20, 5]);
  });
  it('maps issues', () => {
    expect(mapSearchResult({ issues: [{ key: 'MOBL-57', fields: { summary: 'Compliance', status: { name: 'To Do' }, project: { key: 'MOBL' } } }] }))
      .toEqual([{ key: 'MOBL-57', summary: 'Compliance', status: 'To Do', created: null, project: 'MOBL' }]);
    expect(mapSearchResult({})).toEqual([]);
  });
});

import { isTrace, runTriage } from '../src/core';
describe('isTrace', () => {
  it('accepts real traces and rejects error objects / null', () => {
    const t = runTriage({ issue: { key: 'A-1', summary: 's', description: '', labels: [], components: [], issueType: 'Bug' }, candidates: [] });
    expect(isTrace(t)).toBe(true);
    expect(isTrace(null)).toBe(false);
    expect(isTrace({ error: 'x' })).toBe(false);
    expect(isTrace({ rootHash: 'h', steps: [] })).toBe(false);
  });
});
